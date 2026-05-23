import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

const BOTTLE_PRODUCTS = ["pliny the elder"]

const WEIGHTS: Record<string, number> = {
  can: 500,
  bottle: 600,
  crowler: 1200,
}

const VOLUMES: Record<string, number> = {
  can: 473,
  bottle: 510,
  crowler: 1000,
}

export default async function setProductWeights({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const productModule = container.resolve(Modules.PRODUCT)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "metadata", "variants.id", "variants.weight", "variants.options.value", "variants.options.option.title"],
  })

  let updated = 0
  for (const product of products as any[]) {
    const title = (product.title ?? "").toLowerCase()
    const comment = ((product.metadata?.comment as string) ?? "").toLowerCase()

    let targetFormat: string | null = null
    if (BOTTLE_PRODUCTS.some((b) => title.includes(b))) {
      targetFormat = "Bottle"
    } else if (comment === "crowler") {
      targetFormat = "Crowler"
    }

    for (const variant of product.variants ?? []) {
      const effectiveFormat = targetFormat ?? "Can"
      const expectedWeight = WEIGHTS[effectiveFormat.toLowerCase()] ?? WEIGHTS.can

      const needsWeightUpdate = variant.weight !== expectedWeight

      if (needsWeightUpdate) {
        await productModule.updateProductVariants(variant.id, { weight: expectedWeight })
        logger.info(`  Updated variant ${variant.id} (${product.title}): weight=${expectedWeight}g`)
        updated++
      }
    }

    const expectedFormat = targetFormat ?? "Can"
    const currentOptions = (product.variants?.[0]?.options ?? [])
    const formatOpt = currentOptions.find((o: any) =>
      (o.option?.title === "Format" || o.option?.title === "format")
    )
    if (formatOpt && formatOpt.value !== expectedFormat) {
      try {
        await (productModule as any).updateProductOptionValues(formatOpt.id, { value: expectedFormat })
        logger.info(`  Updated format option for "${product.title}" → ${expectedFormat}`)
      } catch (err: any) {
        logger.warn(`  Could not update format option for "${product.title}": ${err.message}`)
      }
    }

    const effectiveFormat = (targetFormat ?? "Can").toLowerCase()
    const expectedVolume = VOLUMES[effectiveFormat] ?? VOLUMES.can
    const currentVolume = product.metadata?.volume_ml
    const currentContainer = product.metadata?.container_type
    if (currentVolume !== expectedVolume || currentContainer !== effectiveFormat) {
      await productModule.updateProducts(product.id, {
        metadata: { ...product.metadata, volume_ml: expectedVolume, container_type: effectiveFormat },
      })
      logger.info(`  Set metadata.volume_ml=${expectedVolume}, container_type=${effectiveFormat} for "${product.title}"`)
    }
  }

  logger.info(`\nDone. Updated ${updated} variant weights.`)
}
