import { ExecArgs } from "@medusajs/framework/types"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function setShippingPrices({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT)
  const regionModule = container.resolve(Modules.REGION)
  const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK)

  logger.info("=== SETTING SHIPPING PRICES ===\n")

  const [region] = await regionModule.listRegions({ currency_code: "aud" })
  if (!region) {
    logger.error("No AUD region found!")
    return
  }
  logger.info(`Region: ${region.name} (${region.id}, currency: ${region.currency_code})`)

  const options = await fulfillmentModule.listShippingOptions({})
  logger.info(`Found ${options.length} shipping options\n`)

  const priceMap: Record<string, number> = {
    "Standard Shipping (3-5 days)": 12,
    "Express Shipping (1-2 days)": 18,
    "Melbourne City": 0,
    "Hillside Victoria": 0,
  }

  for (const opt of options) {
    const price = priceMap[opt.name]
    if (price === undefined) {
      logger.info(`  Skipping unknown option: ${opt.name}`)
      continue
    }

    try {
      await fulfillmentModule.updateShippingOptions(opt.id, {
        prices: [
          {
            currency_code: "aud",
            amount: price,
          },
        ],
      } as any)
      logger.info(`  ${opt.name}: $${price.toFixed(2)} AUD`)
    } catch (e: any) {
      logger.warn(`  Failed to set price for ${opt.name}: ${e.message}`)
      logger.info(`  (Prices may need to be set via admin UI for region-specific pricing)`)
    }
  }

  logger.info("\n=== DONE ===")
}
