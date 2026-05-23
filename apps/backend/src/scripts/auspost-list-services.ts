import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"
import { getAusPostClient } from "../modules/auspost/factory"

/**
 * Discovery script: hits PAC /service.json with a Sydney -> Melbourne 1.5kg
 * sample shipment and prints the available services + prices.
 *
 * Usage:
 *   AUSPOST_API_KEY=$KEY pnpm exec medusa exec ./src/scripts/auspost-list-services.ts
 *
 * When AUSPOST_API_KEY is empty, the stub adapter returns deterministic AUD
 * rates so dev runs without credentials.
 */
export default async function listAusPostServices({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const client = getAusPostClient()

  const live = !!process.env.AUSPOST_API_KEY
  logger.info(`AusPost PAC mode: ${live ? "LIVE" : "STUB"}`)
  logger.info("")

  // Sample shipment: 1.5kg parcel, Sydney CBD -> Melbourne CBD, our Medium box.
  const sample = {
    fromPostcode: "2000",
    toPostcode: "3000",
    lengthCm: 24,
    widthCm: 19,
    heightCm: 12,
    weightKg: 1.5,
  }

  try {
    const services = await client.listServices(sample)
    if (!services.length) {
      logger.warn("PAC returned no services for sample shipment.")
      return
    }
    logger.info(
      `Sample: ${sample.fromPostcode} -> ${sample.toPostcode}, ${sample.weightKg}kg, ${sample.lengthCm}x${sample.widthCm}x${sample.heightCm}cm`,
    )
    logger.info("")
    for (const s of services) {
      const cover = s.max_extra_cover !== undefined ? `cover up to $${s.max_extra_cover}` : "no cover info"
      logger.info(`  ${s.code.padEnd(38)}  $${s.price.padStart(7)}  ${s.name} (${cover})`)
    }
    logger.info("")
    logger.info("Set SiteConfig 'auspost_services_enabled' to the codes you want to surface at checkout.")
    logger.info("(Admin -> Site Config -> shipping group, or PATCH /admin/site-config/auspost_services_enabled).")
  } catch (err) {
    logger.error(`PAC discovery failed: ${(err as Error).message}`)
  }
}
