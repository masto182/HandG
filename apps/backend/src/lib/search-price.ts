import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

const CURRENCY = "aud"

export async function getMinPrices(
  container: any,
  productIds: string[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  if (productIds.length === 0) return result

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const pricing = container.resolve(Modules.PRICING) as any

  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: ["id", "product_id", "price_set.id"],
    filters: { product_id: productIds },
  })

  const priceSetToProduct = new Map<string, string>()
  for (const v of variants as any[]) {
    if (v.price_set?.id) priceSetToProduct.set(v.price_set.id, v.product_id)
  }
  const priceSetIds = [...priceSetToProduct.keys()]
  if (priceSetIds.length === 0) return result

  const calculated = await pricing.calculatePrices(
    { id: priceSetIds },
    { context: { currency_code: CURRENCY } }
  )

  for (const c of calculated as any[]) {
    const amount = c?.calculated_amount
    const productId = priceSetToProduct.get(c?.id)
    if (typeof amount !== "number" || !productId) continue
    const prev = result.get(productId)
    if (prev === undefined || amount < prev) result.set(productId, amount)
  }
  return result
}
