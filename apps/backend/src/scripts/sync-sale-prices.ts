/**
 * Sync production sale prices to the "Beers from the US" spreadsheet.
 *
 * The spreadsheet is the source of truth: each row carries a base price ("Was")
 * and a discount ("Sale"), and the sale price is Was x (1 - Sale). Production had
 * drifted behind a round of discount updates, so this applies the sheet's current
 * sale prices.
 *
 * Two operations, driven by the payload:
 *   op="update" — the product already has an active hg-sale-* price list; the
 *                 price is updated in place via updatePriceListPricesWorkflow,
 *                 preserving the price list and price IDs.
 *   op="create" — the product has no active sale price list; one is created via
 *                 createPriceListsWorkflow, matching the hg-sale-{handle}
 *                 convention used by import-us-beers.ts.
 *
 * Safety: every update entry carries the amount it expects to find, and every
 * create entry asserts no active sale list exists yet. Any drift aborts the whole
 * run before a single write. Both paths keep price.amount and price.raw_amount
 * consistent because they go through the Medusa workflows rather than raw SQL.
 *
 * NOTE: index_data caches the price amount and is NOT refreshed by a backend
 * restart. After this runs, re-sync it (see the project notes) or the storefront
 * will keep serving the old numbers.
 *
 * Usage:
 *   PAYLOAD_PATH=/tmp/sale-price-sync-payload.json \
 *     npx medusa exec ./src/scripts/sync-sale-prices.ts             # dry run
 *   DRY_RUN=false PAYLOAD_PATH=/tmp/sale-price-sync-payload.json \
 *     npx medusa exec ./src/scripts/sync-sale-prices.ts             # commit
 */
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"
import {
  createPriceListsWorkflow,
  updatePriceListPricesWorkflow,
} from "@medusajs/medusa/core-flows"
import * as fs from "fs"

interface SyncEntry {
  op: "update" | "create"
  handle: string
  label: string
  variant_id: string
  currency_code: string
  base: number
  sale_pct: number
  to: number
  left: number
  from: number | null
  price_list_id?: string
  price_id?: string
  price_list_title?: string
}

const TOLERANCE = 0.005

export default async function syncSalePrices({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const pricing = container.resolve(Modules.PRICING)

  const payloadPath = process.env.PAYLOAD_PATH ?? "/tmp/sale-price-sync-payload.json"
  const dryRun = process.env.DRY_RUN !== "false"

  if (!fs.existsSync(payloadPath)) throw new Error(`Payload not found at ${payloadPath}`)
  const entries: SyncEntry[] = JSON.parse(fs.readFileSync(payloadPath, "utf8"))
  if (!Array.isArray(entries) || !entries.length) throw new Error("Payload is empty")

  const updates = entries.filter((e) => e.op === "update")
  const creates = entries.filter((e) => e.op === "create")

  logger.info(
    `${dryRun ? "[DRY RUN] " : ""}Loaded ${entries.length} sale-price changes ` +
      `(${updates.length} update, ${creates.length} create) from ${payloadPath}`
  )

  const problems: string[] = []

  // --- Preconditions: updates must match their expected current amount ---
  if (updates.length) {
    const ids = updates.map((e) => e.price_id!)
    const live = await pricing.listPrices(
      { id: ids },
      { select: ["id", "amount", "price_list_id"] }
    )
    const byId = new Map<string, any>((live as any[]).map((p) => [p.id, p]))
    for (const e of updates) {
      const p = byId.get(e.price_id!)
      if (!p) {
        problems.push(`${e.handle}: price ${e.price_id} no longer exists`)
        continue
      }
      if (Math.abs(Number(p.amount) - Number(e.from)) > TOLERANCE) {
        problems.push(`${e.handle}: expected current ${e.from}, found ${p.amount}`)
      }
      if (p.price_list_id !== e.price_list_id) {
        problems.push(
          `${e.handle}: price is on list ${p.price_list_id}, expected ${e.price_list_id}`
        )
      }
    }
  }

  // --- Preconditions: creates must not already have a sale list ---
  if (creates.length) {
    // Neither `title` nor `type` is a filterable price-list prop, so list and match here.
    const existing = await pricing.listPriceLists({}, { select: ["id", "title", "status", "type"] })
    const byTitle = new Map<string, any>((existing as any[]).map((pl) => [pl.title, pl]))
    for (const e of creates) {
      const pl = byTitle.get(e.price_list_title!)
      if (pl) {
        problems.push(
          `${e.handle}: price list ${e.price_list_title} already exists (${pl.id}, ${pl.status}) — expected none`
        )
      }
    }
  }

  if (problems.length) {
    for (const p of problems) logger.error(`PRECONDITION: ${p}`)
    throw new Error(
      `Aborting without writing: ${problems.length} precondition failure(s). ` +
        `Production no longer matches the payload — regenerate it and retry.`
    )
  }
  logger.info(`Preconditions OK for all ${entries.length} entries.`)

  let net = 0
  for (const e of entries) {
    const fromLabel = e.from === null ? "(none)" : String(e.from)
    if (e.from !== null) net += e.to - e.from
    logger.info(
      `  ${e.op.toUpperCase().padEnd(6)} ${e.handle.padEnd(48)} base=${String(e.base).padStart(6)} ` +
        `${fromLabel.padStart(8)} -> ${String(e.to).padStart(8)} (${e.sale_pct}% off, ${e.left} left)`
    )
  }
  logger.info(
    `Summary: ${updates.length} updated, ${creates.length} created. ` +
      `Net change across updated prices: ${net.toFixed(2)} AUD`
  )

  if (dryRun) {
    logger.info("[DRY RUN] No changes written. Re-run with DRY_RUN=false to apply.")
    return
  }

  // --- Apply updates in place ---
  if (updates.length) {
    const data = updates.map((e) => ({
      id: e.price_list_id!,
      prices: [
        {
          id: e.price_id!,
          amount: e.to,
          currency_code: e.currency_code,
          variant_id: e.variant_id,
        },
      ],
    }))
    logger.info(`Updating ${data.length} existing sale price(s)...`)
    await updatePriceListPricesWorkflow(container).run({ input: { data } as any })
  }

  // --- Create missing sale price lists ---
  for (const e of creates) {
    await createPriceListsWorkflow(container).run({
      input: {
        price_lists_data: [
          {
            title: e.price_list_title!,
            description: `Sale price for ${e.handle}`,
            type: "sale",
            status: "active",
            prices: [
              {
                variant_id: e.variant_id,
                currency_code: e.currency_code,
                amount: e.to,
              },
            ],
          },
        ],
      } as any,
    })
    logger.info(`  created ${e.price_list_title} @ ${e.to}`)
  }

  // --- Verify by read-back ---
  const failed: string[] = []

  if (updates.length) {
    const after = await pricing.listPrices(
      { id: updates.map((e) => e.price_id!) },
      { select: ["id", "amount"] }
    )
    const byId = new Map<string, any>((after as any[]).map((p) => [p.id, p]))
    for (const e of updates) {
      const got = Number(byId.get(e.price_id!)?.amount)
      if (Math.abs(got - e.to) > TOLERANCE) {
        failed.push(`${e.handle}: wanted ${e.to}, read back ${got}`)
      }
    }
  }

  if (creates.length) {
    const allSaleLists = await pricing.listPriceLists(
      {},
      { select: ["id", "title", "status", "type"] }
    )
    const byTitle = new Map<string, any>((allSaleLists as any[]).map((pl) => [pl.title, pl]))

    for (const e of creates) {
      const pl = byTitle.get(e.price_list_title!)
      if (!pl) {
        failed.push(`${e.handle}: price list ${e.price_list_title} was not created`)
        continue
      }
      const prices = await pricing.listPrices(
        { price_list_id: [pl.id] },
        { select: ["id", "amount"] }
      )
      const amounts = (prices as any[]).map((p) => Number(p.amount))
      if (!amounts.some((a) => Math.abs(a - e.to) <= TOLERANCE)) {
        failed.push(
          `${e.handle}: list ${pl.id} created but has no price ${e.to} (found ${amounts.join(", ") || "none"})`
        )
      }
    }
  }

  if (failed.length) {
    for (const f of failed) logger.error(`VERIFY FAILED: ${f}`)
    throw new Error(`${failed.length}/${entries.length} changes did not persist correctly`)
  }

  logger.info(`Verified: all ${entries.length} sale prices now match the spreadsheet.`)
  logger.info("NEXT: re-sync index_data (a backend restart does NOT do it for price edits).")
}
