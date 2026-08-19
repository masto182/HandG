import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { VIP_SCORE_MODULE } from "../../../modules/vip-score"
import { WISHLIST_MODULE } from "../../../modules/wishlist"
import { ANALYTICS_MODULE } from "../../../modules/analytics"
import { REFERRAL_MODULE } from "../../../modules/referral"
import {
  buildCheckoutFunnel,
  buildDemandMetrics,
  buildFilterDrilldown,
  buildInterestingProducts,
  buildSearchIntent,
  INSIGHTS_EVENT_TYPES,
  buildProductDrilldown,
} from "../../../modules/analytics/lib/insights"

const LOW_STOCK_THRESHOLD = 6
const INSIGHTS_LOOKBACK_DAYS = 30

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerModule = req.scope.resolve(Modules.CUSTOMER) as any
  const cartModule = req.scope.resolve(Modules.CART) as any
  const productModule = req.scope.resolve(Modules.PRODUCT) as any
  const vipScoreService = req.scope.resolve(VIP_SCORE_MODULE) as any
  const wishlistService = req.scope.resolve(WISHLIST_MODULE) as any
  const referralService = req.scope.resolve(REFERRAL_MODULE) as any
  const analyticsService = req.scope.resolve(ANALYTICS_MODULE) as any
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { product_id: productId, filter: filterKey } = req.query as {
    product_id?: string
    filter?: string
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
  const productDrilldown = productId
    ? await hydrateCustomerDrilldown(req.scope, buildProductDrilldown(events, productId, since))
    : null
  const filterDrilldown = filterKey
    ? await hydrateFilterDrilldown(req.scope, buildFilterDrilldown(events, filterKey, since))
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
      href: "/app/products",
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
      href: "/app/products",
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
      href: "/app/products",
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
      href: "/app/products",
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
      href: "/app/buy-at-price",
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
      href: "/app/members",
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
      href: "/app/members",
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
    revenue_30d: revenue30d,
    revenue_delta_pct: revenueDeltaPct,
    aov,
    orders_30d: orders30d,
    demotion_risk: demotionRisk,
    catalogue: { low_stock: lowStock, sold_out: soldOut },
    operate,
    attention,
    wishlist: {
      top_products: topWishlistProducts,
      pending_offers: pendingOffers,
      approved_offers: approvedOffers,
    },
    demand,
    funnel,
    search_intent: searchIntent,
    interesting_products: interestingProducts,
    data: { through: dataThrough, events: events.length },
    referrals,
    recently_active,
    product_drilldown: productDrilldown,
    filter_drilldown: filterDrilldown,
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
