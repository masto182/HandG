import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { VIP_SCORE_MODULE } from "../../../modules/vip-score"
import { WISHLIST_MODULE } from "../../../modules/wishlist"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerModule = req.scope.resolve(Modules.CUSTOMER) as any
  const cartModule = req.scope.resolve(Modules.CART) as any
  const vipScoreService = req.scope.resolve(VIP_SCORE_MODULE) as any
  const wishlistService = req.scope.resolve(WISHLIST_MODULE) as any

  const customers = await customerModule.listCustomers({}, { relations: ["groups"] })

  const totalMembers = customers.length
  const pendingMembers = customers.filter(
    (c: any) => c.metadata?.status === "pending"
  ).length
  const approvedMembers = customers.filter((c: any) =>
    c.groups?.some((g: any) => g.name === "approved")
  ).length
  const applicationsSubmitted = customers.filter(
    (c: any) => c.metadata?.status != null
  ).length

  const allScores = await vipScoreService.listVipScores({})
  const tierDistribution: Record<string, number> = {}
  for (const s of allScores) {
    const tier = (s as any).current_tier || "none"
    tierDistribution[tier] = (tierDistribution[tier] || 0) + 1
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  let abandonedCarts = 0
  try {
    const carts = await cartModule.listCarts(
      { completed_at: null },
      { select: ["id", "updated_at", "items"] }
    )
    abandonedCarts = carts.filter((c: any) => {
      const hasItems = (c.items?.length || 0) > 0
      const stale = new Date(c.updated_at) < oneDayAgo
      return hasItems && stale
    }).length
  } catch {}

  let topWishlistProducts: Array<{ product_id: string; count: number }> = []
  try {
    const wishlists = await wishlistService.listWishlists({})
    const productCounts = new Map<string, number>()
    for (const w of wishlists) {
      const pid = (w as any).product_id
      productCounts.set(pid, (productCounts.get(pid) || 0) + 1)
    }
    topWishlistProducts = Array.from(productCounts.entries())
      .map(([product_id, count]) => ({ product_id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  } catch {}

  let pendingOffers = 0
  let approvedOffers = 0
  try {
    const allWishlists = await wishlistService.listWishlists({ mode: "buy_at_price" })
    for (const w of allWishlists) {
      if ((w as any).admin_approved_offer) approvedOffers++
      else pendingOffers++
    }
  } catch {}

  res.json({
    members: {
      total: totalMembers,
      pending: pendingMembers,
      approved: approvedMembers,
      applications_submitted: applicationsSubmitted,
    },
    tiers: tierDistribution,
    abandoned_carts: abandonedCarts,
    wishlist: {
      top_products: topWishlistProducts,
      pending_offers: pendingOffers,
      approved_offers: approvedOffers,
    },
  })
}
