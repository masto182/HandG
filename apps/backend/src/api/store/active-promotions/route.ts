import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * Returns promo codes for promotions that should apply automatically to
 * any qualifying cart, with no code entry required.
 *
 * Medusa's `is_automatic: true` flag is UI metadata only — it does NOT
 * cause a promotion to actually apply to a cart (confirmed: no cart
 * workflow ever auto-discovers is_automatic promotions; only an explicit
 * `promo_codes` update re-scans them). The storefront bridges this gap by
 * fetching codes from this route and pushing them onto the cart (see
 * apps/storefront/src/lib/data/cart.ts `applyAutomaticPromotionsToCart`,
 * mirroring the existing per-customer `applyApprovedOffersToCart` bridge).
 *
 * Deliberately excludes promotions with top-level `rules` (e.g. the
 * per-customer "Buy at Price" wishlist offers, which target via
 * `rules: [{attribute: "customer_id", ...}]`) — those are handled by the
 * existing customer-specific bridge and pushing them here would be
 * redundant. Only truly generic marketing promotions (no rules) are
 * returned.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: promotions } = await query.graph({
    entity: "promotion",
    fields: ["id", "code", "is_automatic", "status", "rules.id"],
    filters: { is_automatic: true, status: "active" } as any,
  })

  const codes = (promotions as any[])
    .filter((p) => !p.rules || p.rules.length === 0)
    .map((p) => p.code)

  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300")
  res.json({ codes })
}
