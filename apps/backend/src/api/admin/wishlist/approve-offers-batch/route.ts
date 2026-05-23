import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { approveWishlistOffersWorkflow } from "../../../../workflows/approve-wishlist-offers"

type ApprovalBody = {
  approvals: Array<{
    wishlist_id: string
    customer_id: string
    product_id: string
    offer_price: number
    expires_at?: string | null
  }>
  currency_code?: string
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const body = req.body as ApprovalBody

  if (!body?.approvals?.length) {
    res.status(400).json({ error: "approvals array is required" })
    return
  }

  for (const a of body.approvals) {
    if (!a.wishlist_id || !a.customer_id || !a.product_id || a.offer_price == null) {
      res.status(400).json({
        error:
          "each approval must have wishlist_id, customer_id, product_id, offer_price",
      })
      return
    }
  }

  const { result } = await approveWishlistOffersWorkflow(req.scope).run({
    input: {
      approvals: body.approvals,
      currency_code: body.currency_code || "aud",
    },
  })

  res.json(result)
}
