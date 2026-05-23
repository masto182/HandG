import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const wishlistService = req.scope.resolve("wishlist") as any
  const customerModule = req.scope.resolve(Modules.CUSTOMER) as any
  const productModule = req.scope.resolve(Modules.PRODUCT) as any

  const mode = (req.query.mode as string) || "price_point"
  const pending = req.query.pending === "true"
  const currency = ((req.query.currency_code as string) || "aud").toLowerCase()

  const filter: any = {}
  // Belt-and-suspenders: legacy rows may still have mode='price_point' from
  // before the buy_at_price rename. Accept either when callers ask for the
  // canonical key. Safe to remove once we're confident no legacy rows remain.
  if (mode === "buy_at_price") {
    filter.mode = { $in: ["buy_at_price", "price_point"] }
  } else {
    filter.mode = mode
  }
  if (pending) filter.admin_approved_offer = false
  const items = await wishlistService.listWishlists(filter)

  const enriched = await Promise.all(
    items.map(async (item: any) => {
      let customer_email: string | undefined
      let product_title: string | undefined
      let current_price: number | null = null
      try {
        const [c] = await customerModule.listCustomers({ id: item.customer_id })
        customer_email = c?.email
      } catch {}
      try {
        const [p] = await productModule.listProducts(
          { id: item.product_id },
          { select: ["id", "title"], relations: ["variants", "variants.prices"] }
        )
        product_title = p?.title
        const prices: number[] = []
        for (const v of p?.variants || []) {
          for (const pr of v.prices || []) {
            if (pr.currency_code === currency) prices.push(Number(pr.amount))
          }
        }
        if (prices.length) current_price = Math.min(...prices)
      } catch {}
      return {
        id: item.id,
        customer_id: item.customer_id,
        product_id: item.product_id,
        target_price: item.target_price,
        admin_approved_offer: item.admin_approved_offer,
        admin_offer_price: item.admin_offer_price,
        admin_offer_expires_at: item.admin_offer_expires_at,
        customer_email,
        product_title,
        current_price,
      }
    })
  )

  res.json({ wishlists: enriched, wishlist_items: enriched })
}
