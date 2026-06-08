import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { getMeiliClient, PRODUCTS_INDEX } from "../lib/meilisearch"

type Logger = {
  info: (msg: string) => void
  warn: (msg: string) => void
  error: (msg: string) => void
}

export default async function productSearchIndexer({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger") as Logger
  const productModule = container.resolve(Modules.PRODUCT)
  const meili = await getMeiliClient()
  const index = meili.index(PRODUCTS_INDEX)

  const productId = event.data.id
  const eventName = event.name

  if (eventName === "product.deleted") {
    try {
      await index.deleteDocument(productId)
    } catch (err) {
      logger.error(
        `[Search] Failed to delete ${productId} from index: ${err instanceof Error ? err.message : String(err)}`
      )
      throw err
    }
    return
  }

  const [product] = await productModule.listProducts(
    { id: productId },
    {
      select: [
        "id",
        "title",
        "handle",
        "description",
        "metadata",
        "created_at",
        "thumbnail",
        "status",
      ],
      relations: ["variants"],
    }
  )

  if (!product || product.status !== "published") {
    try {
      await index.deleteDocument(productId)
    } catch (err) {
      logger.warn(
        `[Search] Could not delete unpublished ${productId} from index: ${err instanceof Error ? err.message : String(err)}`
      )
    }
    return
  }

  const meta = (product as any).metadata || {}
  const desc = product.description || ""

  let styleName = meta.style || ""
  let styleFamily = ""
  let hopNames: string[] = []
  let hopCountries: string[] = []
  let linkedBreweries: Array<{ id: string; slug: string; name: string }> = []
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: linked } = await query.graph({
      entity: "product",
      fields: [
        "beer_styles.*",
        "hops.*",
        "hops.country_code",
        "breweries.id",
        "breweries.slug",
        "breweries.name",
      ],
      filters: { id: productId },
    })
    const style = (linked?.[0] as any)?.beer_styles?.[0]
    if (style) {
      styleName = style.name || styleName
      styleFamily = style.family || ""
    }
    const linkedHops = (linked?.[0] as any)?.hops || []
    hopNames = linkedHops.map((h: any) => h.name).filter(Boolean)
    hopCountries = linkedHops
      .map((h: any) => h.country_code)
      .filter(Boolean)
      .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)
    linkedBreweries = (linked?.[0] as any)?.breweries || []
  } catch (err) {
    logger.warn(
      `[Search] linked data lookup failed for ${productId}: ${err instanceof Error ? err.message : String(err)}`
    )
  }

  const isCollab = linkedBreweries.length > 1

  try {
    await index.addDocuments(
      [
        {
          id: product.id,
          title: product.title,
          handle: product.handle,
          description: desc,
          brewery: meta.brewery || "",
          style: styleName,
          style_family: styleFamily,
          abv: parseFloat(meta.abv) || 0,
          untappd_score: parseFloat(meta.untappd_score) || 0,
          created_at_ts: product.created_at ? new Date(product.created_at).getTime() : 0,
          thumbnail: (product as any).thumbnail || null,
          is_collab: isCollab,
          hops: hopNames.length > 0 ? hopNames : Array.isArray(meta.hops) ? meta.hops : [],
          hop_countries: hopCountries,
          inventory_qty: (product as any).variants?.[0]?.inventory_quantity || 0,
        },
      ],
      { primaryKey: "id" }
    )
  } catch (err) {
    logger.error(
      `[Search] Index write failed for ${productId}: ${err instanceof Error ? err.message : String(err)}`
    )
    throw err
  }
}

export const config: SubscriberConfig = {
  event: ["product.created", "product.updated", "product.deleted"],
}
