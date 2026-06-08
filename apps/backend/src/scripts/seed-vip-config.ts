import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"
import { SITE_CONFIG_MODULE } from "../modules/site-config"
import type SiteConfigModuleService from "../modules/site-config/service"

/**
 * Seed the site-config row that drives per-tier early-access visibility.
 *
 * Forward-looking model: a product whose `release_at = T` becomes purchasable
 * by VIP4/VIP5 at T, by VIP3 at T+12h, VIP2 at T+18h, VIP1 at T+21h, and
 * approved members at T+24h. The values below are the per-tier
 * "hours before public" — public being the moment the product is fully
 * released, i.e. T+24h.
 *
 *   vip5 / vip4: 24h  (instant access at release_at)
 *   vip3:        12h  (visible 12h before public)
 *   vip2:         6h
 *   vip1:         3h
 *   approved:     0h  (coincides with public release; no preview)
 *
 * Idempotent: re-running overwrites the row.
 */
export default async function seedVipConfig({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const siteConfig = container.resolve(SITE_CONFIG_MODULE) as SiteConfigModuleService

  await siteConfig.set("vip_early_access_offsets_hours", {
    vip5: 24,
    vip4: 24,
    vip3: 12,
    vip2: 6,
    vip1: 3,
    approved: 0,
  })

  logger.info(
    "[seed-vip-config] vip_early_access_offsets_hours set (approved tier coincides with T+24h)"
  )
}
