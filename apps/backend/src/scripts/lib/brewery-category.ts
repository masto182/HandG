/**
 * Shared brewery -> product-category resolution/assignment helpers.
 *
 * Convention (matches src/api/admin/products/[id]/collab-breweries/route.ts):
 * a product's PRIMARY brewery is whichever linked brewery's `slug` matches
 * `product.metadata.brewery_slug`. Any other linked brewery is a collab
 * partner and must never be assigned this product's category.
 */

export type LinkedBrewery = { id: string; slug: string; name: string }

export function resolvePrimaryBrewery(
  product: { metadata?: Record<string, any> | null },
  linkedBreweries: LinkedBrewery[]
): LinkedBrewery | null {
  const primarySlug = (product?.metadata as any)?.brewery_slug || null
  if (!primarySlug) return null
  return linkedBreweries.find((b) => b.slug === primarySlug) || null
}

export async function findOrCreateBreweryCategory(
  productModule: any,
  brewery: { slug: string; name: string }
): Promise<{ id: string }> {
  const existing = await productModule.listProductCategories({ handle: brewery.slug })
  if (existing?.length) return existing[0]
  return await productModule.createProductCategories({
    name: brewery.name,
    handle: brewery.slug,
    is_active: true,
  })
}

export async function assignProductsToBreweryCategory(
  productModule: any,
  productIds: string[],
  categoryId: string
): Promise<void> {
  for (const id of productIds) {
    await productModule.updateProducts(id, { categories: [{ id: categoryId }] })
  }
}

/**
 * Product Type equivalents, used for promotion targeting.
 *
 * Product Category is NOT usable as a promotion rule attribute — Medusa's
 * cart line items never carry a category field (confirmed: core-flows'
 * prepare-line-item-data.js only denormalizes product_type_id and
 * product_collection onto cart_line_item, never a category). Product Type
 * IS carried on line items, so it's the correct attribute for any
 * per-brewery promotion (target_rules / buy_rules on product_type_id).
 */
export async function findOrCreateBreweryProductType(
  productModule: any,
  brewery: { slug: string; name: string }
): Promise<{ id: string }> {
  const value = `${brewery.name} (brewery)`
  const existing = await productModule.listProductTypes({ value })
  if (existing?.length) return existing[0]
  return await productModule.createProductTypes({ value })
}

export async function assignProductsToBreweryProductType(
  productModule: any,
  productIds: string[],
  typeId: string
): Promise<void> {
  for (const id of productIds) {
    await productModule.updateProducts(id, { type_id: typeId })
  }
}
