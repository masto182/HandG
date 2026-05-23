import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function imageSuggestionRun(container: MedusaContainer) {
  const logger = container.resolve("logger") as any
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  logger.info("[Image Suggestions] Starting run...")

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "thumbnail", "images"],
  })

  const missingImages = (products as any[]).filter(
    (p) => !p.thumbnail && (!p.images || p.images.length === 0)
  )

  logger.info(
    `[Image Suggestions] Found ${missingImages.length} products without images`
  )
  logger.info("[Image Suggestions] STUBBED — awaiting Untappd/web search integration for image sources")
  logger.info("[Image Suggestions] Complete (no-op)")
}

export const config = {
  name: "image-suggestion-run",
  schedule: "0 */6 * * *",
}
