import { Modules } from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/framework/types"
import { SERVICE_FAMILIES, familyOptionData } from "../../modules/shipping-common/service-families"

export const LEGACY_LIVE_RATE_OPTION_NAMES = ["ShipEngine Live Rates", "Australia Post Live Rates"]

const HIDDEN_FROM_STORE = [{ attribute: "enabled_in_store", operator: "eq", value: "false" }]

type EnsureArgs = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  container: { resolve: (key: string) => any }
  logger: Logger
  dryRun?: boolean
  serviceZoneId?: string
  shippingProfileId?: string
}

/**
 * Idempotently create one calculated shipping option per carrier service family
 * and hide the legacy catch-all live-rate options from the storefront. The
 * legacy options stay selectable in admin so pre-migration orders still fulfil.
 * Matched on data.family first, then name, so renames don't duplicate options.
 */
export async function ensurePerServiceShippingOptions({
  container,
  logger,
  dryRun = false,
  serviceZoneId,
  shippingProfileId,
}: EnsureArgs): Promise<{ created: string[]; updated: string[]; hidden: string[] }> {
  const fulfillment = container.resolve(Modules.FULFILLMENT)
  const result = { created: [] as string[], updated: [] as string[], hidden: [] as string[] }
  const tag = dryRun ? "[dry-run] " : ""

  const providers = await fulfillment.listFulfillmentProviders()
  const allOptions = await fulfillment.listShippingOptions({}, { relations: ["rules"] })
  const legacy = allOptions.filter((o: { name: string }) =>
    LEGACY_LIVE_RATE_OPTION_NAMES.includes(o.name)
  )

  const zoneId = serviceZoneId ?? legacy[0]?.service_zone_id
  const profileId = shippingProfileId ?? legacy[0]?.shipping_profile_id
  if (!zoneId || !profileId) {
    logger.warn(
      "[per-service-shipping] No service zone / shipping profile found (no legacy live-rate option). Skipping."
    )
    return result
  }

  for (const family of SERVICE_FAMILIES) {
    const provider = providers.find((p: { id: string }) => p.id.includes(family.provider))
    if (!provider) {
      logger.warn(
        `[per-service-shipping] Provider ${family.provider} not registered; skipping ${family.name}`
      )
      continue
    }
    const data = familyOptionData(family)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing =
      allOptions.find((o: any) => o.data?.family === family.family) ??
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      allOptions.find((o: any) => o.name === family.name)

    if (existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = existing as any
      const needsUpdate =
        e.name !== family.name ||
        e.data?.family !== family.family ||
        JSON.stringify(e.data?.service_codes ?? []) !== JSON.stringify(family.service_codes)
      if (needsUpdate) {
        logger.info(
          `${tag}[per-service-shipping] Updating "${e.name}" -> "${family.name}" (${e.id})`
        )
        if (!dryRun) {
          await fulfillment.updateShippingOptions(e.id, { name: family.name, data })
        }
        result.updated.push(family.name)
      }
      continue
    }

    logger.info(`${tag}[per-service-shipping] Creating "${family.name}" on ${provider.id}`)
    if (!dryRun) {
      // Module method (not the workflow): calculated options need no price set,
      // and it avoids provider validation resolving through Awilix.
      await fulfillment.createShippingOptions({
        name: family.name,
        price_type: "calculated",
        service_zone_id: zoneId,
        shipping_profile_id: profileId,
        provider_id: provider.id,
        data,
        type: {
          label: family.name,
          description: `Live ${family.name} rate`,
          code: family.family,
        },
        rules: [],
      })
    }
    result.created.push(family.name)
  }

  for (const option of legacy) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rules = ((option as any).rules ?? []) as Array<{ attribute: string; value: unknown }>
    const alreadyHidden = rules.some(
      (r) => r.attribute === "enabled_in_store" && String(r.value).replace(/"/g, "") === "false"
    )
    if (alreadyHidden) continue
    logger.info(
      `${tag}[per-service-shipping] Hiding legacy "${option.name}" from storefront (${option.id})`
    )
    if (!dryRun) {
      const kept = rules
        .filter((r) => r.attribute !== "enabled_in_store")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => ({
          id: r.id,
          attribute: r.attribute,
          operator: r.operator,
          value: r.value,
        }))
      await fulfillment.updateShippingOptions(option.id, { rules: [...kept, ...HIDDEN_FROM_STORE] })
    }
    result.hidden.push(option.name)
  }

  logger.info(
    `${tag}[per-service-shipping] created=${result.created.length} updated=${result.updated.length} hidden=${result.hidden.length}`
  )
  return result
}
