import { MedusaRequest, MedusaResponse, AuthenticatedMedusaRequest } from "@medusajs/framework/http"
import { toggleProductLikeWorkflow } from "../../../../../workflows/toggle-product-like"
import { WISHLIST_MODULE } from "../../../../../modules/wishlist"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const productId = req.params.id
  const wishlistService = req.scope.resolve(WISHLIST_MODULE) as any

  const likes = await wishlistService.listWishlists({
    product_id: productId,
    mode: "like",
  })
  const count = likes.length

  let liked_by_me = false
  const actorId = (req as any).auth_context?.actor_id
  if (actorId) {
    liked_by_me = likes.some((l: any) => l.customer_id === actorId)
  }

  res.json({ product_id: productId, count, liked_by_me })
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const productId = req.params.id
  const customerId = req.auth_context.actor_id

  const { result } = await toggleProductLikeWorkflow(req.scope).run({
    input: { customer_id: customerId, product_id: productId },
  })

  res.json({ product_id: productId, count: (result as any).like_count, liked_by_me: (result as any).liked })
}
