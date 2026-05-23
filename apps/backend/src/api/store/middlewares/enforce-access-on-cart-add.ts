import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  canCustomerAccessProduct,
  computeTierVisibleFrom,
  type Tier,
} from "../../../lib/access/early-access"

/**
 * Authoritative access enforcement for cart-add.
 *
 * The storefront countdown UI is advisory; this middleware is the ground
 * truth. Any attempt to add a variant (or increase its quantity) whose
 * product is still in an early-access window the customer can't reach
 * returns 409 access_not_yet_available with the timestamp the customer
 * will be allowed access.
 *
 * Expected routes:
 *   POST /store/carts/:id/line-items
 *   POST /store/carts/:id/line-items/:line_id   (quantity updates)
 */
export async function enforceAccessOnCartAdd(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const tier = ((req as any).customer_tier as Tier | null) ?? null
  const body = (req.body || {}) as { variant_id?: string; quantity?: number }

  if (!body.variant_id) return next()
  if (typeof body.quantity === "number" && body.quantity <= 0) return next()

  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data: variants } = await query.graph({
      entity: "variant",
      fields: ["id", "product.id", "product.metadata"],
      filters: { id: body.variant_id },
    })

    const product = (variants as any[])?.[0]?.product
    const eaUntilRaw = product?.metadata?.early_access_until
    const eaUntil = eaUntilRaw ? new Date(eaUntilRaw) : null

    if (eaUntil && !isNaN(eaUntil.getTime())) {
      if (!canCustomerAccessProduct(tier, eaUntil)) {
        res.status(409).json({
          error: "access_not_yet_available",
          message:
            "This product is still in its early-access window. You'll be able to add it to your cart once your tier's window opens.",
          available_at: eaUntil.toISOString(),
          your_available_at: tier
            ? computeTierVisibleFrom(eaUntil, tier).toISOString()
            : eaUntil.toISOString(),
          your_tier: tier,
        })
        return
      }
    }
  } catch {
    // If lookup fails, fall through. Medusa's normal validation still runs.
  }

  return next()
}
