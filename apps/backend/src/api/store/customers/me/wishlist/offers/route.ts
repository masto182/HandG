import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const wishlistService = req.scope.resolve("wishlist") as any
  const productModule = req.scope.resolve(Modules.PRODUCT) as any

  const items = await wishlistService.listWishlists({
    customer_id: customerId,
    admin_approved_offer: true,
  })

  const now = Date.now()
  const offers = [] as any[]
  for (const item of items) {
    const expires = item.admin_offer_expires_at
      ? new Date(item.admin_offer_expires_at).getTime()
      : null
    if (expires && expires < now) continue

    const [product] = await productModule.listProducts(
      { id: item.product_id },
      { select: ["id", "title", "handle", "thumbnail", "metadata"] }
    )

    offers.push({
      wishlist_id: item.id,
      product_id: item.product_id,
      offer_price: item.admin_offer_price,
      expires_at: item.admin_offer_expires_at,
      promotion_code: item.promotion_code,
      product: product
        ? {
            id: product.id,
            title: product.title,
            handle: product.handle,
            thumbnail: product.thumbnail,
            brewery_name: (product as any).metadata?.brewery_name || null,
          }
        : null,
    })
  }

  res.json({ offers, count: offers.length })
}
