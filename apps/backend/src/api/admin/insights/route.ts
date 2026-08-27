import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { VIP_SCORE_MODULE } from "../../../modules/vip-score"
import { WISHLIST_MODULE } from "../../../modules/wishlist"
import { ANALYTICS_MODULE } from "../../../modules/analytics"
import { REFERRAL_MODULE } from "../../../modules/referral"
import { CAMPAIGN_MODULE } from "../../../modules/campaign"
import {
  buildCheckoutFunnel,
  buildCheckoutSessionSummaries,
  buildDemandMetrics,
  buildFilterDrilldown,
  buildInterestingProducts,
  buildSearchIntent,
  INSIGHTS_EVENT_TYPES,
  buildProductDrilldown,
} from "../../../modules/analytics/lib/insights"

const LOW_STOCK_THRESHOLD = 6
const INSIGHTS_LOOKBACK_DAYS = 30
// Sell-through velocity and buyer segmentation are durable traits, not 30d
// snapshots — they need a much wider order history to have any sample size
// (a beer that sold out 90 days ago still tells you how fast it moved).
const BEHAVIOUR_LOOKBACK_DAYS = 365

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerModule = req.scope.resolve(Modules.CUSTOMER) as any
  const cartModule = req.scope.resolve(Modules.CART) as any
  const productModule = req.scope.resolve(Modules.PRODUCT) as any
  const vipScoreService = req.scope.resolve(VIP_SCORE_MODULE) as any
  const wishlistService = req.scope.resolve(WISHLIST_MODULE) as any
  const referralService = req.scope.resolve(REFERRAL_MODULE) as any
  const analyticsService = req.scope.resolve(ANALYTICS_MODULE) as any
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const {
    product_id: productId,
    filter: filterKey,
    funnel_stage: funnelStage,
  } = req.query as {
    product_id?: string
    filter?: string
    funnel_stage?: string
  }
  const since = new Date(Date.now() - INSIGHTS_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)

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
  // is applied at DB level via the filters parameter. "Has items" cannot be
  // expressed at the DB filter level here, so it's always applied as a
  // post-filter below — a cart with zero items was never abandoned purchase
  // intent, just an empty visit, and must not inflate the count.
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  let abandonedCarts = 0
  let abandonedCartRecords: any[] = []
  try {
    const [carts, cartCount] = await cartModule.listAndCountCarts(
      {
        completed_at: null,
        updated_at: { $lt: oneDayAgo.toISOString() },
      },
      { select: ["id", "customer_id", "email", "updated_at"], relations: ["items"] }
    )
    // listAndCountCarts may not support updated_at filter in all Medusa versions;
    // fall back to a filtered list if unsupported (indicated by a non-numeric count).
    const candidateCarts =
      typeof cartCount === "number"
        ? carts
        : await cartModule.listCarts(
            { completed_at: null },
            { select: ["id", "customer_id", "email", "updated_at"], relations: ["items"] }
          )
    abandonedCartRecords = candidateCarts.filter((c: any) => {
      const hasItems = (c.items?.length || 0) > 0
      const stale = new Date(c.updated_at) < oneDayAgo
      return hasItems && stale
    })
    abandonedCarts = abandonedCartRecords.length
  } catch {}

  // Revenue + AOV over the last 30 days (order.total stored as-is, not cents)
  let revenue30d = 0
  let orders30d = 0
  let capturedOrders: any[] = []
  const unitsSoldByProduct = new Map<string, number>()
  try {
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "total",
        "created_at",
        "customer_id",
        "payment_collections.status",
        "payment_collections.captured_amount",
        "items.variant_id",
        "items.quantity",
      ],
      filters: { created_at: { $gte: since.toISOString() } } as any,
    })
    capturedOrders = (orders as any[]).filter(hasCapturedPayment)
    for (const o of capturedOrders) {
      revenue30d += Number(o.total || 0)
      orders30d++
      for (const line of o.items || []) {
        if (!line.variant_id) continue
        unitsSoldByProduct.set(
          line.variant_id,
          (unitsSoldByProduct.get(line.variant_id) || 0) + Number(line.quantity || 0)
        )
      }
    }
  } catch {}
  const aov = orders30d > 0 ? revenue30d / orders30d : 0

  // Prior-period revenue (60–30 days ago) for comparison-first deltas.
  let revenuePrior30d = 0
  const priorSince = new Date(since.getTime() - INSIGHTS_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
  try {
    const { data: priorOrders } = await query.graph({
      entity: "order",
      fields: [
        "total",
        "created_at",
        "payment_collections.status",
        "payment_collections.captured_amount",
      ],
      filters: { created_at: { $gte: priorSince.toISOString(), $lt: since.toISOString() } } as any,
    })
    for (const o of (priorOrders as any[]).filter(hasCapturedPayment)) {
      revenuePrior30d += Number(o.total || 0)
    }
  } catch {}

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

  // Catalogue stock health: sum available qty per product across variant levels.
  // Also capture on-hand per product and variant->product mapping (for the
  // Operate sell-through table, which needs units sold rolled up to product).
  let lowStock = 0
  let soldOut = 0
  const onHandByProduct = new Map<string, number>()
  const variantToProduct = new Map<string, string>()
  try {
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: [
        "id",
        "product_id",
        "title",
        "inventory_items.inventory.location_levels.available_quantity",
      ],
    })
    for (const v of variants as any[]) {
      variantToProduct.set(v.id, v.product_id)
      let qty = 0
      for (const ii of v.inventory_items || []) {
        for (const ll of ii.inventory?.location_levels || []) {
          qty += Number(ll.available_quantity || 0)
        }
      }
      onHandByProduct.set(v.product_id, (onHandByProduct.get(v.product_id) || 0) + qty)
    }
    for (const qty of onHandByProduct.values()) {
      if (qty <= 0) soldOut++
      else if (qty <= LOW_STOCK_THRESHOLD) lowStock++
    }
  } catch {}

  // Operate table: per-product 30d units sold, on-hand, weeks-of-supply.
  const soldByProduct = new Map<string, number>()
  for (const [variantId, qty] of unitsSoldByProduct) {
    const productId = variantToProduct.get(variantId)
    if (!productId) continue
    soldByProduct.set(productId, (soldByProduct.get(productId) || 0) + qty)
  }
  const WEEKS_PER_MONTH = 4.33
  const operate = Array.from(new Set([...onHandByProduct.keys(), ...soldByProduct.keys()]))
    .map((productId) => {
      const sold = soldByProduct.get(productId) || 0
      const onHand = onHandByProduct.get(productId) || 0
      const weeklyRate = sold / WEEKS_PER_MONTH
      const weeksOfSupply =
        weeklyRate > 0 ? Math.round((onHand / weeklyRate) * 10) / 10 : onHand > 0 ? 99 : 0
      let status: "out" | "reorder" | "healthy" | "no_sales" = "healthy"
      if (onHand <= 0) status = "out"
      else if (weeksOfSupply > 0 && weeksOfSupply <= 12) status = "reorder"
      else if (weeklyRate <= 0) status = "no_sales"
      return {
        product_id: productId,
        sold,
        on_hand: onHand,
        weeks_of_supply: weeksOfSupply,
        status,
      }
    })
    .sort((a, b) => {
      const rank = { out: 0, reorder: 1, no_sales: 2, healthy: 3 } as const
      return rank[a.status] - rank[b.status] || b.sold - a.sold
    })

  const events: any[] = await listAnalyticsEvents(analyticsService)
  // Data Health: newest event timestamp + raw event volume for the lookback window.
  let dataThrough: string | null = null
  for (const event of events) {
    const ts = event?.created_at
    if (!ts) continue
    const iso = new Date(ts).toISOString()
    if (!dataThrough || iso > dataThrough) dataThrough = iso
  }
  const demand = buildDemandMetrics(events, since)
  const funnel = buildCheckoutFunnel(events, since)

  // Abandoned cart detail: join raw (authoritative) cart records to the
  // event-derived checkout session, which is keyed by cart_id whenever a
  // cart_id was captured in the checkout event payloads — giving "who" (from
  // the cart itself, works even if analytics events never fired) and "how
  // far they got" (from tracked checkout steps, when available).
  const stageLabelByKey = new Map(funnel.stages.map((s) => [s.key, s.label]))
  const sessionByCartId = new Map(
    buildCheckoutSessionSummaries(events, since).map((s) => [s.session_id, s])
  )
  const abandonedCartCustomerIds = abandonedCartRecords
    .map((c: any) => c.customer_id)
    .filter(Boolean)
  const abandonedCartCustomersById = await loadCustomersById(req.scope, abandonedCartCustomerIds)
  const abandonedCartDetails = abandonedCartRecords
    .slice()
    .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 50)
    .map((cart: any) => {
      const session = sessionByCartId.get(cart.id)
      return {
        cart_id: cart.id,
        customer_id: cart.customer_id ?? null,
        customer: cart.customer_id
          ? (abandonedCartCustomersById.get(cart.customer_id) ?? null)
          : null,
        email: cart.email ?? null,
        item_count: (cart.items ?? []).length,
        items: (cart.items ?? []).slice(0, 5).map((item: any) => ({
          title: item.product_title ?? item.title ?? "Item",
          quantity: item.quantity ?? 1,
        })),
        updated_at: cart.updated_at,
        last_stage: session ? (stageLabelByKey.get(session.max_stage) ?? session.max_stage) : null,
      }
    })

  const productDrilldown = productId
    ? await hydrateCustomerDrilldown(req.scope, buildProductDrilldown(events, productId, since))
    : null
  const filterDrilldown = filterKey
    ? await hydrateFilterDrilldown(req.scope, buildFilterDrilldown(events, filterKey, since))
    : null
  const funnelStageDrilldown = funnelStage
    ? await hydrateCustomerDrilldown(
        req.scope,
        funnel.dropped_by_stage[funnelStage as keyof typeof funnel.dropped_by_stage] ?? []
      )
    : null
  const referrals = await buildReferralInsights(req.scope, referralService, capturedOrders)

  const recentlyActiveRaw = await analyticsService.listRecentlyActiveCustomers(since, 10)
  const recentlyActiveCustomers = await loadCustomersById(
    req.scope,
    recentlyActiveRaw.map((row: any) => row.customer_id)
  )
  const recently_active = recentlyActiveRaw.map((row: any) => ({
    customer_id: row.customer_id,
    customer: recentlyActiveCustomers.get(row.customer_id) ?? null,
    last_seen_at: row.last_seen_at,
    last_path: row.last_path ?? null,
  }))

  const searchIntent = buildSearchIntent(events, since)
  const interestingProducts = buildInterestingProducts(events, since)

  // Hydrate real product identity (title + brewery) everywhere a product_id
  // is displayed. Event-payload `handle` is best-effort (only present when the
  // firing event happened to capture it) and was showing raw IDs whenever it
  // was missing — hydrating from the catalogue is always authoritative.
  const productIdsToHydrate = new Set<string>([
    ...operate.map((row) => row.product_id),
    ...demand.top_products.map((p) => p.product_id),
    ...interestingProducts.map((p) => p.product_id),
  ])
  const productsById = await loadProductsById(productModule, [...productIdsToHydrate])
  const breweryNameBySlug = await loadBreweryNameBySlug(query)
  const withProductIdentity = <T extends { product_id: string; handle?: string }>(row: T) => {
    const product = productsById.get(row.product_id)
    const brewerySlug = product?.metadata?.brewery_slug
    return {
      ...row,
      title: product?.title ?? null,
      brewery_name: brewerySlug ? (breweryNameBySlug.get(brewerySlug) ?? brewerySlug) : null,
      handle: row.handle || product?.handle || "",
    }
  }
  const hydratedOperate = operate.map(withProductIdentity)
  const hydratedTopProducts = demand.top_products.map(withProductIdentity)
  const hydratedInterestingProducts = interestingProducts.map(withProductIdentity)

  // Wider (365d) captured-order history for the two "durable trait" features
  // below — sell-through velocity and buyer type are not meaningful on a 30d
  // window (a beer that sold through weeks ago still tells you how fast it
  // moved; a customer's price sensitivity doesn't reset every month).
  const longRangeOrders = await fetchLongRangeCapturedOrders(query, BEHAVIOUR_LOOKBACK_DAYS)

  const sellThrough = await computeSellThrough(
    query,
    hydratedOperate,
    productsById,
    breweryNameBySlug,
    longRangeOrders
  )

  const buyerSegmentationRaw = await computeBuyerSegmentation(
    req.scope,
    wishlistService,
    longRangeOrders
  )
  const [premiumSample, bargainSample] = await Promise.all([
    loadCustomersById(req.scope, buyerSegmentationRaw.premiumCustomerIds.slice(0, 20)),
    loadCustomersById(req.scope, buyerSegmentationRaw.bargainCustomerIds.slice(0, 20)),
  ])
  const buyerSegmentation = {
    premium: {
      customers: buyerSegmentationRaw.premiumCustomerIds.length,
      revenue: buyerSegmentationRaw.premiumRevenue,
      sample: buyerSegmentationRaw.premiumCustomerIds
        .slice(0, 20)
        .map((id) => premiumSample.get(id))
        .filter(Boolean),
    },
    bargain: {
      customers: buyerSegmentationRaw.bargainCustomerIds.length,
      revenue: buyerSegmentationRaw.bargainRevenue,
      sample: buyerSegmentationRaw.bargainCustomerIds
        .slice(0, 20)
        .map((id) => bargainSample.get(id))
        .filter(Boolean),
    },
    window_days: BEHAVIOUR_LOOKBACK_DAYS,
    method_note:
      "Bargain = at least one order overlapping a tracked campaign discount window for that product, or converted from an approved buy-at-price wishlist offer. Premium = every tracked order was at full price. CSV-only sale pricing (no campaign record, no start/end dates) can't be detected this way and may undercount bargain buyers.",
  }

  const revenueDeltaPct =
    revenuePrior30d > 0
      ? Math.round(((revenue30d - revenuePrior30d) / revenuePrior30d) * 100)
      : null

  // Attention Queue: deterministic, exception-based items with an owner and a drill-down.
  const attention: Array<{
    id: string
    severity: "high" | "medium" | "low"
    title: string
    detail: string
    magnitude: number
    magnitude_label: string
    href?: string
  }> = []
  if (soldOut > 0) {
    attention.push({
      id: "sold_out",
      severity: "high",
      title: `${soldOut} product${soldOut > 1 ? "s" : ""} are sold out`,
      detail: "Zero units available. Reorder to keep catalogue complete.",
      magnitude: soldOut,
      magnitude_label: `${soldOut} products`,
      href: "/products",
    })
  }
  if (lowStock > 0) {
    attention.push({
      id: "low_stock",
      severity: "medium",
      title: `${lowStock} product${lowStock > 1 ? "s" : ""} are running low`,
      detail: `On-hand at or below ${LOW_STOCK_THRESHOLD} units. Check the Operate tab for reorder flags.`,
      magnitude: lowStock,
      magnitude_label: `${lowStock} products`,
      href: "/products",
    })
  }
  const noCart = interestingProducts.filter((p) => p.cart_adds === 0 && p.views < 60)
  if (noCart.length > 0) {
    attention.push({
      id: "interest_no_cart",
      severity: "medium",
      title: `${noCart.length} products are seen but not added to cart`,
      detail: "High exposure, zero cart adds. Consider price, stock visibility, or position.",
      magnitude: Math.max(...noCart.map((p) => p.views)),
      magnitude_label: `up to ${Math.max(...noCart.map((p) => p.views))} views`,
      href: "/products",
    })
  }
  const zeroResultSearches = searchIntent.filter((s) => s.zero_results > 0)
  if (zeroResultSearches.length > 0) {
    attention.push({
      id: "zero_result_searches",
      severity: "low",
      title: `${zeroResultSearches.length} search${zeroResultSearches.length > 1 ? "s" : ""} returned nothing`,
      detail: zeroResultSearches
        .slice(0, 3)
        .map((s) => `"${s.query}" (${s.zero_results}×)`)
        .join(", "),
      magnitude: zeroResultSearches.reduce((sum, s) => sum + s.zero_results, 0),
      magnitude_label: `${zeroResultSearches.reduce((sum, s) => sum + s.zero_results, 0)} zero-result searches`, // prettier-ignore
      href: "/products",
    })
  }
  if (pendingOffers > 0) {
    attention.push({
      id: "pending_offers",
      severity: "medium",
      title: `${pendingOffers} buy-at-price offer${pendingOffers > 1 ? "s" : ""} pending review`,
      detail: "A customer wants to set a price. Approving keeps momentum.",
      magnitude: pendingOffers,
      magnitude_label: `${pendingOffers} offers`,
      href: "/buy-at-price",
    })
  }
  if (pendingMembers > 0) {
    attention.push({
      id: "pending_applications",
      severity: "medium",
      title: `${pendingMembers} member application${pendingMembers > 1 ? "s" : ""} pending`,
      detail: "Approve or decline to keep membership responsive.",
      magnitude: pendingMembers,
      magnitude_label: `${pendingMembers} applications`,
      href: "/members",
    })
  }
  if (demotionRisk > 0) {
    attention.push({
      id: "demotion_risk",
      severity: "medium",
      title: `${demotionRisk} VIP${demotionRisk > 1 ? "s" : ""} at risk of demotion`,
      detail: "Falling below spend threshold. Consider a win-back touchpoint.",
      magnitude: demotionRisk,
      magnitude_label: `${demotionRisk} members`,
      href: "/members",
    })
  }
  attention.sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2 }
    return rank[a.severity] - rank[b.severity]
  })

  res.json({
    members: {
      total: totalMembers,
      pending: pendingMembers,
      approved: approvedMembers,
      applications_submitted: applicationsSubmitted,
    },
    tiers: tierDistribution,
    abandoned_carts: abandonedCarts,
    abandoned_cart_details: abandonedCartDetails,
    revenue_30d: revenue30d,
    revenue_delta_pct: revenueDeltaPct,
    aov,
    orders_30d: orders30d,
    demotion_risk: demotionRisk,
    catalogue: { low_stock: lowStock, sold_out: soldOut },
    operate: hydratedOperate,
    attention,
    wishlist: {
      top_products: topWishlistProducts,
      pending_offers: pendingOffers,
      approved_offers: approvedOffers,
    },
    demand: { ...demand, top_products: hydratedTopProducts },
    funnel,
    search_intent: searchIntent,
    interesting_products: hydratedInterestingProducts,
    sell_through: sellThrough,
    buyer_segmentation: buyerSegmentation,
    data: { through: dataThrough, events: events.length },
    referrals,
    recently_active,
    product_drilldown: productDrilldown,
    filter_drilldown: filterDrilldown,
    funnel_stage_drilldown: funnelStageDrilldown,
  })
}

async function listAnalyticsEvents(analyticsService: any) {
  try {
    return (await analyticsService.listRecentStorefrontEvents({
      since: new Date(Date.now() - INSIGHTS_LOOKBACK_DAYS * 24 * 60 * 60 * 1000),
      eventTypes: [...INSIGHTS_EVENT_TYPES],
      batchSize: 500,
      maxResults: 5000,
    })) as any[]
  } catch {
    return []
  }
}

async function fetchLongRangeCapturedOrders(query: any, days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  try {
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "customer_id",
        "total",
        "created_at",
        "payment_collections.status",
        "payment_collections.captured_amount",
        "items.product_id",
        "items.variant_id",
        "items.quantity",
      ],
      filters: { created_at: { $gte: since.toISOString() } } as any,
    })
    return (orders as any[]).filter(hasCapturedPayment)
  } catch {
    return []
  }
}

// Sell-through velocity ("days on shelf"): for products that have actually
// sold out, days between listing (product.created_at — the only reliable
// proxy; there's no dedicated "published_at" field) and their most recent
// recorded sale within the lookback window. Products still in stock are
// excluded — their shelf life hasn't finished yet, so any number would be a
// lower bound dressed up as an average, which is the misleading thing here.
async function computeSellThrough(
  query: any,
  operate: any[],
  productsById: Map<string, any>,
  breweryNameBySlug: Map<string, string>,
  longRangeOrders: any[]
) {
  const empty = {
    overall_avg_days: null as number | null,
    sample_size: 0,
    by_brewery: [] as Array<{ label: string; avg_days: number; count: number }>,
    by_hop: [] as Array<{ label: string; avg_days: number; count: number }>,
    by_abv_band: [] as Array<{ label: string; avg_days: number; count: number }>,
    by_collab: [] as Array<{ label: string; avg_days: number; count: number }>,
  }

  const outOfStockIds = operate.filter((r) => r.status === "out").map((r) => r.product_id)
  if (!outOfStockIds.length) return empty

  const lastSoldByProduct = new Map<string, Date>()
  for (const order of longRangeOrders) {
    const at = new Date(order.created_at)
    for (const item of order.items || []) {
      if (!item.product_id) continue
      const current = lastSoldByProduct.get(item.product_id)
      if (!current || at > current) lastSoldByProduct.set(item.product_id, at)
    }
  }

  let hopsByProduct = new Map<string, string[]>()
  try {
    const { data: hopProducts } = await query.graph({
      entity: "product",
      fields: ["id", "hops.name"],
      filters: { id: outOfStockIds } as any,
    })
    hopsByProduct = new Map(
      (hopProducts as any[]).map((p) => [p.id, (p.hops || []).map((h: any) => h.name)])
    )
  } catch {}

  let breweriesByProduct = new Map<string, Array<{ name: string; slug: string }>>()
  try {
    const { data: breweries } = await query.graph({
      entity: "brewery",
      fields: ["name", "slug", "products.id"],
    })
    breweriesByProduct = new Map()
    for (const b of breweries as any[]) {
      for (const p of b.products || []) {
        const arr = breweriesByProduct.get(p.id) || []
        arr.push({ name: b.name, slug: b.slug })
        breweriesByProduct.set(p.id, arr)
      }
    }
  } catch {}

  type Row = {
    days: number
    brewery_name: string | null
    hops: string[]
    abv_band: string | null
    is_collab: boolean
  }
  const rows: Row[] = []
  for (const productId of outOfStockIds) {
    const product = productsById.get(productId)
    const lastSold = lastSoldByProduct.get(productId)
    if (!product?.created_at || !lastSold) continue
    const days = Math.max(
      0,
      Math.round((lastSold.getTime() - new Date(product.created_at).getTime()) / 86400000)
    )
    const brewerySlug = product.metadata?.brewery_slug
    const breweryName = brewerySlug ? (breweryNameBySlug.get(brewerySlug) ?? brewerySlug) : null
    const linkedBreweries = breweriesByProduct.get(productId) || []
    const isCollab = linkedBreweries.some((b) => b.slug !== brewerySlug)
    const abv = product.metadata?.abv ? parseFloat(product.metadata.abv) : NaN
    const abvBand = Number.isNaN(abv)
      ? null
      : abv < 5
        ? "Under 5%"
        : abv < 7
          ? "5–6.9%"
          : abv < 9
            ? "7–8.9%"
            : "9%+"
    rows.push({
      days,
      brewery_name: breweryName,
      hops: hopsByProduct.get(productId) || [],
      abv_band: abvBand,
      is_collab: isCollab,
    })
  }
  if (!rows.length) return empty

  const avg = (nums: number[]) =>
    Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 10) / 10
  const groupBy = (keyFn: (r: Row) => string[] | string | null) => {
    const map = new Map<string, number[]>()
    for (const r of rows) {
      const raw = keyFn(r)
      if (raw == null) continue
      const keys = Array.isArray(raw) ? raw : [raw]
      for (const key of keys) {
        const arr = map.get(key) || []
        arr.push(r.days)
        map.set(key, arr)
      }
    }
    return Array.from(map.entries())
      .map(([label, days]) => ({ label, avg_days: avg(days), count: days.length }))
      .sort((a, b) => a.avg_days - b.avg_days)
  }

  return {
    overall_avg_days: avg(rows.map((r) => r.days)),
    sample_size: rows.length,
    by_brewery: groupBy((r) => r.brewery_name),
    by_hop: groupBy((r) => (r.hops.length ? r.hops : null)),
    by_abv_band: groupBy((r) => r.abv_band),
    by_collab: groupBy((r) => (r.is_collab ? "Collab" : "Solo")),
  }
}

// Buyer segmentation: classify each captured order as "bargain" (bought
// during a tracked discount window, or converted from an approved
// buy-at-price wishlist offer) or "premium" (full price, as far as we can
// tell). A customer counts as "bargain" if ANY of their orders qualifies.
// See method_note in the API response for the coverage caveat (CSV-only
// sale pricing has no start/end dates and can't be detected this way).
async function computeBuyerSegmentation(scope: any, wishlistService: any, longRangeOrders: any[]) {
  let campaigns: any[] = []
  try {
    const campaignService = scope.resolve(CAMPAIGN_MODULE) as any
    campaigns = await campaignService.listSpecialCampaigns({})
  } catch {}

  let bargainWishlistPairs = new Set<string>()
  try {
    const approvedOffers = await wishlistService.listWishlists({
      mode: "buy_at_price",
      admin_approved_offer: true,
    })
    bargainWishlistPairs = new Set(
      approvedOffers.map((w: any) => `${w.customer_id}:${w.product_id}`)
    )
  } catch {}

  const isDiscountedAt = (productId: string, at: Date) =>
    campaigns.some((c: any) => {
      const targets = Array.isArray(c.target_product_ids) ? c.target_product_ids : []
      if (!targets.includes(productId)) return false
      const starts = new Date(c.starts_at)
      const ends = c.ends_at ? new Date(c.ends_at) : null
      return at >= starts && (!ends || at <= ends)
    })

  const byCustomer = new Map<string, { bargainOrders: number; revenue: number }>()
  for (const order of longRangeOrders) {
    if (!order.customer_id) continue
    const at = new Date(order.created_at)
    const isBargainOrder = (order.items || []).some((item: any) => {
      if (!item.product_id) return false
      if (isDiscountedAt(item.product_id, at)) return true
      return bargainWishlistPairs.has(`${order.customer_id}:${item.product_id}`)
    })
    const agg = byCustomer.get(order.customer_id) ?? { bargainOrders: 0, revenue: 0 }
    if (isBargainOrder) agg.bargainOrders++
    agg.revenue += Number(order.total || 0)
    byCustomer.set(order.customer_id, agg)
  }

  const bargainCustomerIds: string[] = []
  const premiumCustomerIds: string[] = []
  let bargainRevenue = 0
  let premiumRevenue = 0
  for (const [customerId, agg] of byCustomer) {
    if (agg.bargainOrders > 0) {
      bargainCustomerIds.push(customerId)
      bargainRevenue += agg.revenue
    } else {
      premiumCustomerIds.push(customerId)
      premiumRevenue += agg.revenue
    }
  }

  return { bargainCustomerIds, premiumCustomerIds, bargainRevenue, premiumRevenue }
}

function hasCapturedPayment(order: any): boolean {
  const collections = order?.payment_collections ?? []
  return collections.some(
    (collection: any) =>
      collection?.status === "completed" || Number(collection?.captured_amount ?? 0) > 0
  )
}

async function hydrateCustomerDrilldown(scope: any, rows: any[]) {
  const customerIds = rows.map((row) => row.customer_id).filter(Boolean)
  const customersById = await loadCustomersById(scope, customerIds)
  return rows.map((row) => ({
    ...row,
    customer: customersById.get(row.customer_id) ?? null,
  }))
}

async function hydrateFilterDrilldown(scope: any, drilldown: any) {
  const customerIds = drilldown.members.map((member: any) => member.customer_id).filter(Boolean)
  const customersById = await loadCustomersById(scope, customerIds)
  return {
    values: drilldown.values,
    members: drilldown.members.map((member: any) => ({
      ...member,
      customer: customersById.get(member.customer_id) ?? null,
    })),
  }
}

async function loadProductsById(productModule: any, ids: string[]): Promise<Map<string, any>> {
  const uniqueIds = [...new Set(ids)].filter(Boolean)
  if (!uniqueIds.length) return new Map<string, any>()
  const products = await productModule.listProducts(
    { id: uniqueIds },
    { select: ["id", "title", "handle", "thumbnail", "metadata", "created_at"] }
  )
  return new Map(products.map((p: any) => [p.id, p]))
}

async function loadBreweryNameBySlug(query: any) {
  const { data } = await query.graph({
    entity: "brewery",
    fields: ["slug", "name"],
  })
  return new Map((data as any[]).map((b) => [b.slug, b.name]))
}

async function loadCustomersById(scope: any, ids: string[]) {
  const uniqueIds = [...new Set(ids)].filter(Boolean)
  if (!uniqueIds.length) return new Map<string, any>()

  const customerModule = scope.resolve(Modules.CUSTOMER) as any
  const vipScoreService = scope.resolve(VIP_SCORE_MODULE) as any
  const [customers, scores] = await Promise.all([
    customerModule.listCustomers({ id: uniqueIds }, { relations: ["groups"] }),
    vipScoreService.listVipScores({ customer_id: uniqueIds }),
  ])
  const scoreById = new Map(scores.map((score: any) => [score.customer_id, score]))

  return new Map(
    customers.map((customer: any) => {
      const typedCustomer = customer as any
      const score = scoreById.get(typedCustomer.id) as any
      return [
        typedCustomer.id,
        {
          id: typedCustomer.id,
          email: typedCustomer.email,
          name:
            `${typedCustomer.first_name || ""} ${typedCustomer.last_name || ""}`.trim() ||
            typedCustomer.email,
          tier:
            score?.current_tier ||
            (typedCustomer.groups?.some((group: any) => /^vip\d/.test(group.name))
              ? typedCustomer.groups.find((group: any) => /^vip\d/.test(group.name))?.name
              : typedCustomer.groups?.some((group: any) => group.name === "approved")
                ? "approved"
                : typedCustomer.groups?.some((group: any) => group.name === "suspended")
                  ? "suspended"
                  : "pending"),
        },
      ]
    })
  )
}

async function buildReferralInsights(scope: any, referralService: any, capturedOrders: any[]) {
  const customerModule = scope.resolve(Modules.CUSTOMER) as any
  const vipScoreService = scope.resolve(VIP_SCORE_MODULE) as any
  let referrals: any[] = []
  try {
    referrals = (await referralService.listReferrals({})) as any[]
  } catch {
    referrals = []
  }

  const convertedByCustomer = new Map<string, { count: number; revenue: number }>()
  for (const order of capturedOrders) {
    const customerId = order.customer_id as string | null | undefined
    if (!customerId) continue
    const current = convertedByCustomer.get(customerId) ?? { count: 0, revenue: 0 }
    current.count += 1
    current.revenue += Number(order.total || 0) || 0
    convertedByCustomer.set(customerId, current)
  }

  const referrerIds = [
    ...new Set(referrals.map((referral) => referral.referrer_customer_id).filter(Boolean)),
  ]
  const [referrers, scores] = await Promise.all([
    referrerIds.length ? customerModule.listCustomers({ id: referrerIds }, {}) : [],
    referrerIds.length ? vipScoreService.listVipScores({ customer_id: referrerIds }) : [],
  ])
  const referrerById = new Map(referrers.map((customer: any) => [customer.id, customer]))
  const scoreById = new Map(scores.map((score: any) => [score.customer_id, score]))

  const aggregate = new Map<
    string,
    {
      referrer_customer_id: string
      referrals: number
      converted_referrals: number
      converted_orders: number
      revenue: number
      stealth_referrals: number
    }
  >()

  for (const referral of referrals) {
    const key = referral.referrer_customer_id as string
    const current = aggregate.get(key) ?? {
      referrer_customer_id: key,
      referrals: 0,
      converted_referrals: 0,
      converted_orders: 0,
      revenue: 0,
      stealth_referrals: 0,
    }
    current.referrals += 1
    if (referral.stealth_mode) current.stealth_referrals += 1
    const converted = convertedByCustomer.get(referral.referred_customer_id)
    if (converted) {
      current.converted_referrals += 1
      current.converted_orders += converted.count
      current.revenue += converted.revenue
    }
    aggregate.set(key, current)
  }

  return {
    summary: {
      total_referrals: referrals.length,
      converted_referrals: referrals.filter((referral) =>
        convertedByCustomer.has(referral.referred_customer_id)
      ).length,
      stealth_referrals: referrals.filter((referral) => referral.stealth_mode).length,
      // Scoped to customers who were actually referred — NOT every captured
      // order in the store. convertedByCustomer is keyed by customer_id for
      // ALL captured orders; summing it directly would attribute unrelated
      // members' revenue to "referral revenue".
      revenue: referrals.reduce((total, referral) => {
        const converted = convertedByCustomer.get(referral.referred_customer_id)
        return converted ? total + converted.revenue : total
      }, 0),
    },
    top_referrers: Array.from(aggregate.values())
      .map((entry) => {
        const customer = referrerById.get(entry.referrer_customer_id) as any
        return {
          ...entry,
          customer: customer
            ? {
                id: customer.id,
                email: customer.email,
                name:
                  `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
                  customer.email,
                tier: (scoreById.get(customer.id) as any)?.current_tier || "approved",
              }
            : null,
        }
      })
      .sort((a, b) => b.converted_referrals - a.converted_referrals || b.referrals - a.referrals)
      .slice(0, 20),
  }
}
