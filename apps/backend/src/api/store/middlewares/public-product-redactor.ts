import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { redactProductForPublic } from "../../../lib/access/redact"

/**
 * For anonymous / pending / rejected / suspended viewers (req.customer_tier === null),
 * strip pricing, ABV and Untappd from product responses.
 *
 * Unlike the previous implementation, this middleware wraps res.json with a
 * single, named finaliser so the behaviour is explicit, testable, and easy to
 * reason about in one place.
 *
 * Authenticated members (any non-null tier) receive the unmodified response.
 */
export function publicProductRedactor(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const tier = (req as any).customer_tier as string | null

  // Members see full data. No-op.
  if (tier) return next()

  const originalJson = res.json.bind(res)

  res.json = function finalisePublicProductResponse(body: any) {
    try {
      if (body?.products && Array.isArray(body.products)) {
        body.products = body.products.map(redactProductForPublic)
      }
      if (body?.product) {
        body.product = redactProductForPublic(body.product)
      }
    } catch {
      // fall through - never let redaction break responses
    }
    return originalJson(body)
  } as any

  return next()
}
