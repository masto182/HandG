import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { WISHLIST_MODULE } from "../../../../../modules/wishlist"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const wishlistService = req.scope.resolve(WISHLIST_MODULE) as any

  const likes = await wishlistService.listWishlists({
    customer_id: customerId,
    mode: "like",
  })

  res.json({ likes: likes.map((l: any) => l.product_id) })
}
