import { ExecArgs } from "@medusajs/framework/types"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function fixShippingPrices({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const pricingModule = container.resolve(Modules.PRICING)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT)
  const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK)
  const regionModule = container.resolve(Modules.REGION)

  const [region] = await regionModule.listRegions({ currency_code: "aud" })
  if (!region) {
    logger.error("No AUD region found!")
    return
  }

  const allOptions = await fulfillmentModule.listShippingOptions({})

  const correctPrices: Record<string, number> = {
    "Standard Shipping (3-5 days)": 12,
    "Express Shipping (1-2 days)": 18,
    "Melbourne City": 0,
    "Hillside Victoria": 0,
  }

  for (const option of allOptions) {
    const target = correctPrices[option.name]
    if (target === undefined) continue

    const { data: links } = await query.graph({
      entity: "shipping_option_price_set",
      filters: { shipping_option_id: option.id },
      fields: ["price_set_id"],
    }).catch(() => ({ data: [] as any[] }))

    if (links?.length) {
      const priceSetId = (links[0] as any).price_set_id
      const prices = await pricingModule.listPrices({ price_set_id: priceSetId })

      if (prices.length === 0) {
        await pricingModule.addPrices({
          priceSetId,
          prices: [{ currency_code: "aud", amount: target }],
        })
        logger.info(`  Added price for "${option.name}": ${target}`)
      } else {
        for (const price of prices) {
          if (price.amount !== target) {
            await (pricingModule as any).updatePrices([{ id: price.id, amount: target }])
            logger.info(`  Updated price for "${option.name}": ${price.amount} → ${target}`)
          } else {
            logger.info(`  "${option.name}" price already correct: ${target}`)
          }
        }
      }
    } else {
      logger.info(`  No price set link for "${option.name}" — creating one...`)
      const priceSet = await pricingModule.createPriceSets({
        prices: [{ currency_code: "aud", amount: target }],
      })
      await remoteLink.create({
        [Modules.FULFILLMENT]: { shipping_option_id: option.id },
        [Modules.PRICING]: { price_set_id: priceSet.id },
      })
      logger.info(`  Created price set ${priceSet.id} for "${option.name}" with amount ${target}`)
    }
  }

  logger.info("\n=== SHIPPING PRICES FIXED ===")
}
