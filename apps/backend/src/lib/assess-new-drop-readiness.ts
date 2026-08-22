import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { getMeiliClient, PRODUCTS_INDEX } from "./meilisearch"

export type ReadinessResult = {
  productId: string
  blockers: string[]
  warnings: string[]
}

/**
 * Server-enforced readiness gate for the manual new-drop send flow. This is
 * why the send flow is manual in the first place: an admin must be able to
 * trust that "ready to announce" also means "actually purchasable" before
 * an irreversible batch send. Checked both at admin preview time (as
 * badges/warnings) and again immediately before send (as a hard block) -
 * see plan §3/§5.
 *
 * Blocking checks mirror real production failure modes already hit in this
 * codebase: the shipping-profile gap caused a real 35-product outage with
 * zero orders (see scripts/load-to-production.ts:434-450), and the sales
 * channel / publishable key link is the same gap that made products
 * invisible on the storefront despite being "published".
 */
export async function assessNewDropReadiness(
  container: any,
  productId: string,
  publishableChannelIds?: Set<string>
): Promise<ReadinessResult> {
  const blockers: string[] = []
  const warnings: string[] = []

  const productModule = container.resolve(Modules.PRODUCT)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const regionModule = container.resolve(Modules.REGION)
  const pricingModule = container.resolve(Modules.PRICING)

  const [product] = await productModule.listProducts(
    { id: productId },
    {
      select: ["id", "title", "handle", "status", "thumbnail", "metadata"],
      relations: ["variants", "images"],
    }
  )

  if (!product) {
    return { productId, blockers: ["product_not_found"], warnings: [] }
  }

  if (product.status !== "published") blockers.push("not_published")
  if (!product.handle) blockers.push("missing_handle")

  const meta = (product as any).metadata || {}
  const releaseAt = meta.release_at
  if (releaseAt && new Date(releaseAt).getTime() > Date.now()) {
    blockers.push("release_date_in_future")
  }

  const images = (product as any).images || []
  const hasImage = !!product.thumbnail || images.length > 0
  if (!hasImage) blockers.push("missing_image")

  const variants = (product as any).variants || []
  if (!variants.length) {
    blockers.push("no_variants")
  } else {
    const variantIds = variants.map((v: any) => v.id)

    // Calculated price in the store's AUD region (pricing module, not
    // variant.prices - see wishlist-price.ts:9-13 for why).
    let hasPrice = false
    try {
      let regions: any[] = []
      try {
        regions = await regionModule.listRegions({ currency_code: "aud" })
      } catch {
        regions = await regionModule.listRegions({})
      }
      const region = regions[0]
      if (region) {
        const { data: variantPriceLinks } = await query.graph({
          entity: "product_variant_price_set",
          filters: { variant_id: variantIds },
          fields: ["variant_id", "price_set_id"],
        })
        if (variantPriceLinks.length) {
          const priceSetIds = variantPriceLinks.map((l: any) => l.price_set_id)
          const priceSets = await pricingModule.calculatePrices(
            { id: priceSetIds },
            {
              context: {
                region_id: region.id,
                currency_code: region.currency_code || "aud",
              },
            }
          )
          hasPrice = priceSets.some(
            (ps: any) => ps.calculated_amount != null && Number(ps.calculated_amount) > 0
          )
        }
      }
    } catch {
      // leave hasPrice false - a check failure is treated as "not ready"
    }
    if (!hasPrice) blockers.push("no_calculated_price")

    // At least one purchasable variant: unmanaged, backorderable, or
    // positive available quantity after reservations.
    let purchasable = false
    try {
      const { data: variantStock } = await query.graph({
        entity: "product_variant",
        fields: [
          "id",
          "manage_inventory",
          "allow_backorder",
          "inventory_items.inventory.location_levels.available_quantity",
        ],
        filters: { id: variantIds },
      })
      for (const v of variantStock as any[]) {
        if (!v.manage_inventory || v.allow_backorder) {
          purchasable = true
          break
        }
        const items = v.inventory_items || []
        let available = 0
        for (const link of items) {
          const levels = link?.inventory?.location_levels || []
          for (const lvl of levels) {
            available += Number(lvl?.available_quantity ?? 0)
          }
        }
        if (available > 0) {
          purchasable = true
          break
        }
      }
    } catch {
      // leave purchasable false
    }
    if (!purchasable) blockers.push("no_purchasable_stock")
  }

  // Sales channel + publishable key visibility. The channel<->publishable-key
  // link is NOT a directly queryable "api_key_sales_channel" entity (that
  // alias doesn't exist and always throws - confirmed by testing directly;
  // the correct path is the api_key entity's `sales_channels` relation).
  try {
    const { data: scLinks } = await query.graph({
      entity: "product_sales_channel",
      fields: ["sales_channel_id"],
      filters: { product_id: productId },
    })
    if (!scLinks.length) {
      blockers.push("no_sales_channel")
    } else {
      const scIds = new Set<string>(scLinks.map((l: any) => l.sales_channel_id))
      const linkedChannelIds = publishableChannelIds ?? (await getPublishableChannelIds(container))
      const hasLinkedChannel = [...scIds].some((id) => linkedChannelIds.has(id))
      if (!hasLinkedChannel) blockers.push("sales_channel_not_linked_to_publishable_key")
    }
  } catch {
    warnings.push("sales_channel_check_failed")
  }

  // Shipping profile - the exact gap that caused the 2026-08-09 outage.
  try {
    const { data: spLinks } = await query.graph({
      entity: "product_shipping_profile",
      fields: ["shipping_profile_id"],
      filters: { product_id: productId },
    })
    if (!spLinks.length) blockers.push("no_shipping_profile")
  } catch {
    warnings.push("shipping_profile_check_failed")
  }

  // Search visibility - warning only; Meili indexing is async and lagging
  // slightly behind import is normal, not a reason to block a send.
  try {
    const meili = await getMeiliClient()
    const index = meili.index(PRODUCTS_INDEX)
    await index.getDocument(productId)
  } catch {
    warnings.push("not_search_indexed")
  }

  if (!meta.brewery_name && !meta.brewery) warnings.push("missing_brewery_metadata")
  if (!meta.abv) warnings.push("missing_abv")

  return { productId, blockers, warnings }
}

export async function assessNewDropReadinessBatch(
  container: any,
  productIds: string[]
): Promise<Map<string, ReadinessResult>> {
  const out = new Map<string, ReadinessResult>()
  const publishableChannelIds = await getPublishableChannelIds(container)
  for (const id of productIds) {
    out.set(id, await assessNewDropReadiness(container, id, publishableChannelIds))
  }
  return out
}

/** Set of every sales_channel_id linked to at least one publishable API key. */
async function getPublishableChannelIds(container: any): Promise<Set<string>> {
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "api_key",
      fields: ["id", "sales_channels.id"],
      filters: { type: "publishable" },
    })
    const ids = new Set<string>()
    for (const key of data as any[]) {
      for (const ch of key.sales_channels ?? []) {
        if (ch?.id) ids.add(ch.id)
      }
    }
    return ids
  } catch {
    return new Set()
  }
}
