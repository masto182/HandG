import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * Defensive normaliser for admin product responses.
 *
 * Medusa's field parser sometimes returns `variants: null` on the
 * /admin/products list when the admin UI sends a combination of
 * `*sales_channels` + `variants.id` + `-variants`. The bundled admin
 * `ProductStatusCell` then iterates over `product.variants` and throws
 * `undefined is not iterable`, crashing the products list page.
 *
 * This middleware wraps res.json to coerce any null/undefined `variants`
 * (and a few sibling collections) on each product into an empty array,
 * keeping the admin UI happy without changing the underlying data shape.
 */
export function normalizeAdminProductResponse(
  _req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction,
) {
  const originalJson = res.json.bind(res)
  res.json = function (body: unknown) {
    if (body && typeof body === "object") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const b = body as Record<string, any>
      const products = Array.isArray(b.products) ? b.products : Array.isArray(b.product) ? [b.product] : null
      if (products) {
        for (const p of products) {
          if (p && typeof p === "object") {
            if (p.variants == null) p.variants = []
            if (p.options == null) p.options = []
            if (p.images == null) p.images = []
            if (p.tags == null) p.tags = []
            if (p.sales_channels == null) p.sales_channels = []
          }
        }
      }
    }
    return originalJson(body)
  }
  next()
}
