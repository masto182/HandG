import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /admin/shipping/debug-rates?cart_id=:id&require_signature=true
 *
 * Thin admin proxy onto /store/shipping/rates with debug=1 forced. Returns the
 * full enriched payload including the `debug` field with provider_errors and
 * invalid_rates from ShipEngine. Used by the AusPost admin page to investigate
 * "why is carrier X missing?" without exposing debug info to customers.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cartId = req.query.cart_id as string | undefined
  if (!cartId) {
    res.status(400).json({ message: "cart_id query param is required" })
    return
  }

  const requireSignature = req.query.require_signature as string | undefined
  const baseUrl = `${req.protocol}://${req.get("host")}`
  const target = new URL("/store/shipping/rates", baseUrl)
  target.searchParams.set("cart_id", cartId)
  if (requireSignature) target.searchParams.set("require_signature", requireSignature)
  target.searchParams.set("debug", "1")

  // Forward the publishable key header if present; otherwise call internally.
  const headers: Record<string, string> = {}
  const pk = req.get("x-publishable-api-key")
  if (pk) headers["x-publishable-api-key"] = pk

  try {
    const r = await fetch(target.toString(), { headers })
    const text = await r.text()
    res.status(r.status)
    try {
      res.json(JSON.parse(text))
    } catch {
      res.send(text)
    }
  } catch (err) {
    res.status(502).json({ message: `debug fetch failed: ${(err as Error).message}` })
  }
}
