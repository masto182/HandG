import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { updateWishlistWorkflow, removeWishlistWorkflow } from "../../../../../../workflows/manage-wishlist"

export async function PATCH(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const wishlistItemId = req.params.id
  const { mode, target_price, stock_threshold } = req.body as { mode?: string; target_price?: number | null; stock_threshold?: number }
  const wishlistService = req.scope.resolve("wishlist") as any

  const [item] = await wishlistService.listWishlists({ id: wishlistItemId })

  if (!item || item.customer_id !== customerId) {
    return res.status(404).json({ message: "Wishlist item not found" })
  }

  const updates: any = { id: wishlistItemId }
  if (mode) updates.mode = mode
  if (target_price !== undefined) updates.target_price = target_price
  if (stock_threshold !== undefined) updates.stock_threshold = stock_threshold

  const { result } = await updateWishlistWorkflow(req.scope).run({
    input: updates,
  })

  res.json({ wishlist_item: result })
}

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const wishlistItemId = req.params.id
  const wishlistService = req.scope.resolve("wishlist") as any

  const [item] = await wishlistService.listWishlists({ id: wishlistItemId })

  if (!item || item.customer_id !== customerId) {
    return res.status(404).json({ message: "Wishlist item not found" })
  }

  await removeWishlistWorkflow(req.scope).run({
    input: { id: wishlistItemId },
  })

  res.json({ success: true })
}
