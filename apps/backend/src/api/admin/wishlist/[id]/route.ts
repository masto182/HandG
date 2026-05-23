import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { updateWishlistWorkflow } from "../../../../workflows/manage-wishlist"
import { revokeWishlistOfferWorkflow } from "../../../../workflows/approve-wishlist-offers"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const wishlistItemId = req.params.id
  const { offer_price, expires_at } = req.body as {
    offer_price: number
    expires_at?: string
  }
  const wishlistService = req.scope.resolve("wishlist") as any

  const [item] = await wishlistService.listWishlists({ id: wishlistItemId })

  if (!item) {
    return res.status(404).json({ message: "Wishlist item not found" })
  }

  const { result: updated } = await updateWishlistWorkflow(req.scope).run({
    input: {
      id: wishlistItemId,
      admin_approved_offer: true,
      admin_offer_price: offer_price,
      admin_offer_expires_at: expires_at
        ? new Date(expires_at).toISOString()
        : null,
    },
  })

  res.json({ wishlist_item: updated })
}

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const wishlistItemId = req.params.id
  const wishlistService = req.scope.resolve("wishlist") as any

  const [item] = await wishlistService.listWishlists({ id: wishlistItemId })

  if (!item) {
    return res.status(404).json({ message: "Wishlist item not found" })
  }

  const { result: updated } = await revokeWishlistOfferWorkflow(req.scope).run({
    input: { wishlist_id: wishlistItemId },
  })

  res.json({ wishlist_item: updated })
}
