/**
 * Repairs address_1 values that got polluted with a full Google
 * "formatted_address" (e.g. "71 Boyle St, Prospect SA 5082, Australia")
 * instead of just the street line. Caused by a storefront autocomplete bug
 * (fixed separately) that submitted place.formatted_address to the DOM
 * input instead of the parsed street-only string.
 *
 * Only rewrites address_1 when it exactly ends with the SAME row's own
 * city/state/postcode/country (as a comma-joined suffix) — never a general
 * address parser. Preserves address_2/company/phone untouched. Idempotent:
 * running it again finds nothing left to fix.
 *
 * Usage:
 *   npx medusa exec ./src/scripts/repair-malformed-addresses.ts            # dry run (default)
 *   npx medusa exec ./src/scripts/repair-malformed-addresses.ts -- --apply # apply
 */
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

type Row = {
  id: string
  address_1: string
  city: string
  province: string
  postal_code: string
  country_code: string
}

// Tables + the scope filter that keeps this to operationally-live records
// only (see plan: leave completed carts / cancelled fulfillments / unlinked
// snapshots as historical, untouched).
const TARGETS: Array<{ table: string; scopeSql: string }> = [
  { table: "customer_address", scopeSql: "deleted_at IS NULL" },
  {
    table: "order_address",
    scopeSql: `id IN (
      SELECT o.shipping_address_id FROM "order" o
      WHERE o.status = 'pending' AND o.shipping_address_id IS NOT NULL
      UNION
      SELECT o.billing_address_id FROM "order" o
      WHERE o.status = 'pending' AND o.billing_address_id IS NOT NULL
    )`,
  },
  {
    table: "cart_address",
    scopeSql: `deleted_at IS NULL AND id IN (
      SELECT c.shipping_address_id FROM cart c WHERE c.completed_at IS NULL AND c.shipping_address_id IS NOT NULL
      UNION
      SELECT c.billing_address_id FROM cart c WHERE c.completed_at IS NULL AND c.billing_address_id IS NOT NULL
    )`,
  },
  {
    table: "fulfillment_address",
    scopeSql: `id IN (
      SELECT f.delivery_address_id FROM fulfillment f
      WHERE f.deleted_at IS NULL AND f.canceled_at IS NULL AND f.delivery_address_id IS NOT NULL
    )`,
  },
]

function stripDuplicatedLocality(row: Row): string | null {
  const suffix = [row.city, row.province, row.postal_code].filter(Boolean).join(" ")
  const candidates = [
    row.country_code
      ? `, ${row.city} ${row.province} ${row.postal_code}, ${row.country_code === "au" ? "Australia" : row.country_code}`
      : null,
    `, ${row.city} ${row.province} ${row.postal_code}, Australia`,
    `, ${suffix}, Australia`,
    `, ${suffix}`,
  ].filter(Boolean) as string[]

  for (const suf of candidates) {
    if (row.address_1.endsWith(suf)) {
      const stripped = row.address_1.slice(0, -suf.length).trim()
      if (stripped && stripped !== row.address_1) return stripped
    }
  }
  return null
}

export default async function repairMalformedAddresses({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const apply = (args ?? []).includes("--apply")

  logger.info(`[repair-addresses] mode: ${apply ? "APPLY" : "DRY RUN"}`)

  let totalFixed = 0
  for (const { table, scopeSql } of TARGETS) {
    const rows: Row[] = await knex
      .raw(
        `SELECT id, address_1, city, province, postal_code, country_code
       FROM ${table}
       WHERE (${scopeSql})
         AND address_1 IS NOT NULL
         AND (
           address_1 ILIKE '%' || city || '%'
           OR address_1 ILIKE '%' || postal_code || '%'
         )`
      )
      .then((r: { rows: Row[] }) => r.rows)

    let fixedInTable = 0
    for (const row of rows) {
      const newAddress1 = stripDuplicatedLocality(row)
      if (!newAddress1) {
        logger.warn(
          `[repair-addresses] ${table} ${row.id}: matched scan but no exact locality suffix found — skipping (not auto-fixed): "${row.address_1}"`
        )
        continue
      }
      logger.info(`[repair-addresses] ${table} ${row.id}: "${row.address_1}" -> "${newAddress1}"`)
      if (apply) {
        await knex.raw(`UPDATE ${table} SET address_1 = ?, updated_at = now() WHERE id = ?`, [
          newAddress1,
          row.id,
        ])
      }
      fixedInTable++
    }
    logger.info(
      `[repair-addresses] ${table}: ${fixedInTable} row(s) ${apply ? "fixed" : "would be fixed"}`
    )
    totalFixed += fixedInTable
  }

  logger.info(
    `[repair-addresses] done. ${totalFixed} row(s) ${apply ? "fixed" : "would be fixed"} across ${TARGETS.length} tables.` +
      (apply ? "" : " Re-run with --apply to write changes.")
  )
}
