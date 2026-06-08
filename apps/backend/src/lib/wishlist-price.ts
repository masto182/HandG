import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

export type LowestVariantPrice = {
  product: any
  /** Lowest calculated price across the product's variants, in dollars. */
  lowestPrice: number
}

/**
 * Resolve the lowest current calculated price (in dollars) for a product in the
 * store's AUD region. Uses the pricing module (calculatePrices) because Medusa
 * v2 variant prices live in the pricing module, NOT on `variant.prices` — the
 * previous subscriber read `variant.prices` (always undefined) and never fired.
 *
 * Returns null when the product, region, or prices can't be resolved.
 */
export async function getLowestVariantPrice(
  scope: any,
  productId: string
): Promise<LowestVariantPrice | null> {
  const productModule = scope.resolve(Modules.PRODUCT)
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const regionModule = scope.resolve(Modules.REGION)
  const pricingModule = scope.resolve(Modules.PRICING)

  const [product] = await productModule.listProducts(
    { id: productId },
    { select: ["id", "title", "handle", "variants"], relations: ["variants"] }
  )
  if (!product || !product.variants?.length) return null

  let regions: any[] = []
  try {
    regions = await regionModule.listRegions({ currency_code: "aud" })
  } catch {
    regions = await regionModule.listRegions({})
  }
  const region = regions[0]
  if (!region) return null

  const variantIds = product.variants.map((v: any) => v.id)
  const { data: variantPriceLinks } = await query.graph({
    entity: "product_variant_price_set",
    filters: { variant_id: variantIds },
    fields: ["variant_id", "price_set_id"],
  })
  if (variantPriceLinks.length === 0) return null

  const priceSetIds = variantPriceLinks.map((l: any) => l.price_set_id)
  const priceSets = await pricingModule.calculatePrices(
    { id: priceSetIds },
    { context: { region_id: region.id, currency_code: region.currency_code || "aud" } }
  )

  let lowestPrice = Infinity
  for (const ps of priceSets) {
    if (ps.calculated_amount != null && Number(ps.calculated_amount) < lowestPrice) {
      lowestPrice = Number(ps.calculated_amount)
    }
  }
  if (lowestPrice === Infinity) return null

  return { product, lowestPrice }
}
