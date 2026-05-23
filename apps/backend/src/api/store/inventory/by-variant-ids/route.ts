import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /store/inventory/by-variant-ids?ids=variant_xxx,variant_yyy
 *
 * Workaround for a Medusa 2.15.2 issue where the storefront list endpoint
 * `/store/products?fields=+variants.inventory_quantity` 500s with
 * `Entity 'Product' does not have property ''` (Mikro-ORM populate path
 * gets an empty entry when the inventory_quantity virtual field is requested
 * on the listing's `findAndCount` code path).
 *
 * The storefront fetches products without `+variants.inventory_quantity`
 * (so the list call returns 200) and then enriches with this batched
 * inventory call. Returns a stable `{ inventory: { [variantId]: number } }`
 * shape so merging is trivial on the client.
 *
 * Sums available_quantity across all stock locations the variant is linked to.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const idsParam = (req.query.ids as string | undefined) ?? ""
  const variantIds = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  if (!variantIds.length) {
    return res.json({ inventory: {} as Record<string, number> })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // Traverse: variant -> inventory_items (link) -> inventory (item) -> location_levels
  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: [
      "id",
      "manage_inventory",
      "allow_backorder",
      "inventory_items.inventory.location_levels.available_quantity",
      "inventory_items.inventory.location_levels.stocked_quantity",
      "inventory_items.inventory.location_levels.reserved_quantity",
    ],
    filters: { id: variantIds },
  })

  const out: Record<string, number> = {}
  for (const v of variants) {
    const variantId = (v as any).id as string
    const items = ((v as any).inventory_items ?? []) as any[]
    let total = 0
    for (const link of items) {
      const inv = link?.inventory
      const levels = (inv?.location_levels ?? []) as any[]
      for (const lvl of levels) {
        const avail = lvl?.available_quantity
        const computed =
          avail != null
            ? Number(avail)
            : Number(lvl?.stocked_quantity ?? 0) - Number(lvl?.reserved_quantity ?? 0)
        if (Number.isFinite(computed)) total += computed
      }
    }
    out[variantId] = total
  }

  return res.json({ inventory: out })
}
