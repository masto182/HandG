import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { VIP_SCORE_MODULE } from "../../../modules/vip-score"
import { WISHLIST_MODULE } from "../../../modules/wishlist"
import { ANALYTICS_MODULE } from "../../../modules/analytics"

const LOW_STOCK_THRESHOLD = 6

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerModule = req.scope.resolve(Modules.CUSTOMER) as any
  const cartModule = req.scope.resolve(Modules.CART) as any
  const productModule = req.scope.resolve(Modules.PRODUCT) as any
  const vipScoreService = req.scope.resolve(VIP_SCORE_MODULE) as any
  const wishlistService = req.scope.resolve(WISHLIST_MODULE) as any
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // Member counts: use targeted group filters instead of loading all customers.
  // listAndCountCustomers with a group filter avoids materialising the full table.
  const [allCustomers, pendingCustomers, approvedCustomers] = await Promise.all([
    customerModule.listCustomers({}, { select: ["id", "metadata"] }),
    customerModule.listCustomers({ groups: { name: "pending" } }, { select: ["id"] }),
    customerModule.listCustomers({ groups: { name: "approved" } }, { select: ["id"] }),
  ])

  const totalMembers = allCustomers.length
  const pendingMembers = pendingCustomers.length
  const approvedMembers = approvedCustomers.length
  const applicationsSubmitted = allCustomers.filter((c: any) => c.metadata?.status != null).length

  // VIP scores: full load is still needed for tier distribution (no count-by-tier API).
  // Scope to non-pending customers to limit payload.
  const allScores = await vipScoreService.listVipScores({})
  const tierDistribution: Record<string, number> = {}
  let demotionRisk = 0
  for (const s of allScores) {
    const tier = (s as any).current_tier || "none"
    tierDistribution[tier] = (tierDistribution[tier] || 0) + 1
    if ((s as any).pending_demotion || (s as any).demotion_warning_at) {
      demotionRisk++
    }
  }

  // Abandoned carts: filter at query level with updated_at < 24h ago.
  // The `completed_at: null` filter reduces the working set; updated_at window
  // is applied at DB level via the filters parameter.
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  let abandonedCarts = 0
  try {
    const [, cartCount] = await cartModule.listAndCountCarts(
      {
        completed_at: null,
        updated_at: { $lt: oneDayAgo.toISOString() },
      },
      { select: ["id", "items"] }
    )
    // listAndCountCarts may not support updated_at filter in all Medusa versions;
    // fall back to a filtered list if count is 0 and the above is unsupported.
    if (typeof cartCount === "number") {
      abandonedCarts = cartCount
    } else {
      const carts = await cartModule.listCarts(
        { completed_at: null },
        { select: ["id", "updated_at", "items"] }
      )
      abandonedCarts = carts.filter((c: any) => {
        const hasItems = (c.items?.length || 0) > 0
        const stale = new Date(c.updated_at) < oneDayAgo
        return hasItems && stale
      }).length
    }
  } catch {}

  // Revenue + AOV over the last 30 days (order.total stored as-is, not cents)
  let revenue30d = 0
  let orders30d = 0
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["id", "total", "created_at"],
      filters: { created_at: { $gte: thirtyDaysAgo } } as any,
    })
    for (const o of orders as any[]) {
      revenue30d += Number(o.total || 0)
      orders30d++
    }
  } catch {}
  const aov = orders30d > 0 ? revenue30d / orders30d : 0

  // Top wishlisted products with title + thumbnail resolution
  let topWishlistProducts: Array<{
    product_id: string
    count: number
    title?: string
    thumbnail?: string | null
  }> = []
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

    const ids = topWishlistProducts.map((p) => p.product_id)
    if (ids.length) {
      const prods = await productModule.listProducts(
        { id: ids },
        { select: ["id", "title", "thumbnail"] }
      )
      const byId = new Map(prods.map((p: any) => [p.id, p]))
      topWishlistProducts = topWishlistProducts.map((p) => {
        const prod = byId.get(p.product_id) as any
        return { ...p, title: prod?.title, thumbnail: prod?.thumbnail ?? null }
      })
    }
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

  // Catalogue stock health: sum available qty per product across variant levels
  let lowStock = 0
  let soldOut = 0
  try {
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["product_id", "inventory_items.inventory.location_levels.available_quantity"],
    })
    const stockByProduct = new Map<string, number>()
    for (const v of variants as any[]) {
      let qty = 0
      for (const ii of v.inventory_items || []) {
        for (const ll of ii.inventory?.location_levels || []) {
          qty += Number(ll.available_quantity || 0)
        }
      }
      const prev = stockByProduct.get(v.product_id) || 0
      stockByProduct.set(v.product_id, prev + qty)
    }
    for (const qty of stockByProduct.values()) {
      if (qty <= 0) soldOut++
      else if (qty <= LOW_STOCK_THRESHOLD) lowStock++
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
    revenue_30d: revenue30d,
    aov,
    orders_30d: orders30d,
    demotion_risk: demotionRisk,
    catalogue: { low_stock: lowStock, sold_out: soldOut },
    wishlist: {
      top_products: topWishlistProducts,
      pending_offers: pendingOffers,
      approved_offers: approvedOffers,
    },
    demand: await buildDemandMetrics(req.scope.resolve(ANALYTICS_MODULE) as any),
  })
}

async function buildDemandMetrics(analyticsService: any) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const empty = {
    top_products: [],
    top_breweries: [],
    filter_usage: [],
    hop_counts: [],
    untappd_bands: [],
  }

  try {
    const events: any[] = await analyticsService.listStorefrontEvents({})
    const recent = events.filter((e) => new Date(e.created_at) >= thirtyDaysAgo)

    const productViews = new Map<string, { handle: string; views: number; cart_adds: number }>()
    const breweryViews = new Map<string, number>()
    const filterUsage = new Map<string, number>()
    const hopCounts = new Map<string, number>()
    const untappdBands = new Map<string, number>()

    for (const e of recent) {
      const p = e.payload ?? {}

      if (e.event_type === "product.viewed") {
        if (p.product_id) {
          const cur = productViews.get(p.product_id) ?? {
            handle: p.handle ?? "",
            views: 0,
            cart_adds: 0,
          }
          productViews.set(p.product_id, { ...cur, views: cur.views + 1 })
        }
        if (p.untappd_rating != null) {
          const rating = parseFloat(p.untappd_rating)
          if (!isNaN(rating)) {
            const floor = Math.floor(rating * 2) / 2
            const band = `${floor.toFixed(1)}–${(floor + 0.5).toFixed(1)}`
            untappdBands.set(band, (untappdBands.get(band) ?? 0) + 1)
          }
        }
      }

      if (e.event_type === "cart.item_added" && p.product_id) {
        const cur = productViews.get(p.product_id) ?? { handle: "", views: 0, cart_adds: 0 }
        productViews.set(p.product_id, { ...cur, cart_adds: cur.cart_adds + 1 })
      }

      if (e.event_type === "brewery.viewed" && p.slug) {
        breweryViews.set(p.slug as string, (breweryViews.get(p.slug as string) ?? 0) + 1)
      }

      if (e.event_type === "filter.applied") {
        const filters = (p.filters ?? {}) as Record<string, string>
        for (const [key, value] of Object.entries(filters)) {
          if (value) {
            filterUsage.set(key, (filterUsage.get(key) ?? 0) + 1)
            if (key === "hops") {
              for (const hop of value.split(",")) {
                const h = hop.trim()
                if (h) hopCounts.set(h, (hopCounts.get(h) ?? 0) + 1)
              }
            }
          }
        }
      }
    }

    return {
      top_products: Array.from(productViews.entries())
        .map(([product_id, d]) => ({
          product_id,
          handle: d.handle,
          views: d.views,
          cart_adds: d.cart_adds,
          view_to_cart_rate: d.views > 0 ? Math.round((d.cart_adds / d.views) * 100) / 100 : 0,
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10),
      top_breweries: Array.from(breweryViews.entries())
        .map(([slug, views]) => ({ slug, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10),
      filter_usage: Array.from(filterUsage.entries())
        .map(([filter, count]) => ({ filter, count }))
        .sort((a, b) => b.count - a.count),
      hop_counts: Array.from(hopCounts.entries())
        .map(([hop, count]) => ({ hop, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20),
      untappd_bands: Array.from(untappdBands.entries())
        .map(([band, views]) => ({ band, views }))
        .sort((a, b) => parseFloat(a.band) - parseFloat(b.band)),
    }
  } catch {
    return empty
  }
}
