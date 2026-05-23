import { ExecArgs } from "@medusajs/framework/types"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function fixShippingProfiles({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT)
  const productModule = container.resolve(Modules.PRODUCT)
  const link = container.resolve(ContainerRegistrationKeys.REMOTE_LINK)

  const profiles = await fulfillmentModule.listShippingProfiles()
  logger.info(`Shipping profiles: ${profiles.map((p) => `${p.id} (${p.name}, type=${p.type})`).join(", ")}`)

  const options = await fulfillmentModule.listShippingOptions({})
  for (const o of options) {
    logger.info(`  Option: ${o.id} | ${o.name} | shipping_profile_id=${(o as any).shipping_profile_id}`)
  }

  const products = await productModule.listProducts({}, { take: 5 })
  logger.info(`\nSample products:`)
  for (const p of products) {
    logger.info(`  ${p.id} | ${p.title}`)
  }

  const defaultProfile = profiles[0]
  if (!defaultProfile) {
    logger.error("No shipping profile found!")
    return
  }

  logger.info(`\nUsing profile: ${defaultProfile.id} (${defaultProfile.name})`)
  logger.info(`Checking product-profile links...`)

  const allProducts = await productModule.listProducts({}, { take: 1000 })
  let linked = 0
  for (const product of allProducts) {
    try {
      await link.create({
        [Modules.PRODUCT]: { product_id: product.id },
        [Modules.FULFILLMENT]: { shipping_profile_id: defaultProfile.id },
      })
      linked++
    } catch (e: any) {
      if (e.message?.includes("already exists")) continue
      logger.info(`  Failed for ${product.id}: ${e.message?.substring(0, 80)}`)
    }
  }
  logger.info(`Linked ${linked} products to shipping profile ${defaultProfile.id}`)

  const mismatched = options.filter((o: any) => o.shipping_profile_id !== defaultProfile.id)
  if (mismatched.length) {
    logger.info(`\nFixing ${mismatched.length} options with wrong profile...`)
    for (const o of mismatched) {
      await (fulfillmentModule as any).updateShippingOptions({ id: o.id, shipping_profile_id: defaultProfile.id })
      logger.info(`  Updated ${o.name} → profile ${defaultProfile.id}`)
    }
  }

  logger.info("\nDone!")
}
