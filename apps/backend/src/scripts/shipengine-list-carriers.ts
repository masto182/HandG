import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"
import { getShipEngineClient } from "../modules/shipengine/factory"

/**
 * Discovery script: prints every carrier connected to the active ShipEngine
 * account, with carrier_id (use this in SiteConfig shipengine_carrier_ids),
 * carrier_code, friendly_name, and the first few service_codes.
 *
 * Usage:
 *   SHIPENGINE_API_KEY=$KEY pnpm shipengine:list-carriers
 *
 * When SHIPENGINE_API_KEY is empty, the stub adapter returns 2 placeholder
 * carriers (AusPost + CouriersPlease) so dev runs without credentials.
 */
export default async function listCarriers({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const client = getShipEngineClient()

  logger.info(`ShipEngine mode: ${process.env.SHIPENGINE_API_KEY ? "LIVE" : "STUB"}`)
  const carriers = await client.listCarriers()

  if (!carriers.length) {
    logger.warn("No carriers connected.")
    logger.warn("Visit https://dashboard.shipengine.com -> Settings -> Carriers and:")
    logger.warn("  1. Enable CouriersPlease + Aramex Australia from the 'ShipStation Carriers' list (cheaper rates, no contract).")
    logger.warn("  2. Connect Australia Post MyPost Business (your own credentials).")
    return
  }

  logger.info(`Found ${carriers.length} carrier(s):`)
  logger.info("")
  for (const c of carriers) {
    const services = (c.services ?? []).slice(0, 5).map((s) => s.service_code).join(", ") || "(no services)"
    logger.info(`  ${c.carrier_id.padEnd(20)}  ${c.carrier_code.padEnd(28)}  ${c.friendly_name}`)
    logger.info(`    services: ${services}${(c.services?.length ?? 0) > 5 ? ` (+${(c.services?.length ?? 0) - 5} more)` : ""}`)
    logger.info("")
  }
  logger.info("Copy the carrier_id values you want to use into SiteConfig 'shipengine_carrier_ids'")
  logger.info("(Admin -> Site Config -> shipping group, or PATCH /admin/site-config/shipengine_carrier_ids).")
}
