import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { getMeiliClient, PRODUCTS_INDEX } from "../lib/meilisearch"

// Mirrors reindex-search.ts's getFilterGroup — keep in sync.
function getFilterGroup(slug: string | undefined, family: string | undefined): string {
  if (slug === "triple-ipa") return "Triple IPA"
  if (slug === "double-ipa") return "Double IPA"
  if (family === "IPA") return "IPA"
  if (family === "Dark" || family === "Sour" || family === "Lager") return family
  return ""
}

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
      relations: ["variants", "tags"],
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
        "beer_style.*",
        "hops.*",
        "hops.country_code",
        "breweries.id",
        "breweries.slug",
        "breweries.name",
      ],
      filters: { id: productId },
    })
    const style = (linked?.[0] as any)?.beer_style
    if (style) {
      styleName = style.name || styleName
      styleFamily = getFilterGroup(style.slug, style.family)
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

  // productModule.listProducts (above) never populates the inventory_quantity
  // virtual field — same Medusa bug documented in
  // api/store/inventory/by-variant-ids/route.ts and api/admin/wishlist/route.ts.
  let inventoryQty = 0
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: [
        "id",
        "inventory_items.inventory.location_levels.available_quantity",
        "inventory_items.inventory.location_levels.stocked_quantity",
        "inventory_items.inventory.location_levels.reserved_quantity",
      ],
      filters: { product_id: productId },
    })
    for (const v of variants as any[]) {
      for (const ii of v.inventory_items || []) {
        for (const ll of ii.inventory?.location_levels || []) {
          const avail = ll?.available_quantity
          inventoryQty +=
            avail != null
              ? Number(avail)
              : Number(ll?.stocked_quantity ?? 0) - Number(ll?.reserved_quantity ?? 0)
        }
      }
    }
  } catch (err) {
    logger.warn(
      `[Search] inventory lookup failed for ${productId}: ${err instanceof Error ? err.message : String(err)}`
    )
  }

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
          packaged_at_ts: meta.packaged_at
            ? new Date(meta.packaged_at).getTime()
            : meta.released_date
              ? new Date(meta.released_date).getTime()
              : product.created_at
                ? new Date(product.created_at).getTime()
                : 0,
          thumbnail: (product as any).thumbnail || null,
          is_collab: isCollab,
          hops: hopNames.length > 0 ? hopNames : Array.isArray(meta.hops) ? meta.hops : [],
          hop_countries: hopCountries,
          tags: (product as any).tags?.map((t: any) => t.value).filter(Boolean) ?? [],
          inventory_qty: inventoryQty,
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
