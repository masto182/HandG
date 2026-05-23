import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

const BEER_DETAIL_MODULE = "beerDetail"

export default async function syncCollabFlag({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const productId = event.data.id
  if (!productId) return

  const logger = container.resolve("logger") as any
  const productModule = container.resolve(Modules.PRODUCT) as any
  const beerDetailService = container.resolve(BEER_DETAIL_MODULE) as any

  try {
    const [beerDetail] = await beerDetailService.listBeerDetails({ product_id: productId })
    if (!beerDetail) return

    const collabIds: string[] = beerDetail.collab_brewery_ids || []
    const isCollab = collabIds.length > 0

    const product = await productModule.retrieveProduct(productId)
    const currentMeta = (product.metadata || {}) as Record<string, any>
    const currentFlag = currentMeta.is_collab === true || currentMeta.is_collab === "true"

    if (currentFlag !== isCollab) {
      await productModule.updateProducts(productId, {
        metadata: { ...currentMeta, is_collab: isCollab },
      })
      logger.info(`[sync-collab] Product ${productId}: is_collab → ${isCollab}`)
    }
  } catch (e: any) {
    logger.error(`[sync-collab] Failed for ${productId}: ${e.message}`)
  }
}

export const config: SubscriberConfig = {
  event: ["product.updated"],
}
