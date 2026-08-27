import { mergeSessionCustomers } from "./merge-session-customers"
import { ANALYTICS_EVENT_TYPES } from "./storefront-event-types"

export type AnalyticsEvent = {
  event_type: string
  session_id: string | null
  customer_id: string | null
  created_at?: string | Date | null
  payload?: Record<string, any> | null
}

export type CheckoutStageKey =
  "cart" | "fulfilment" | "address" | "shipping" | "payment" | "review" | "placed" | "completed"

export type CheckoutStage = {
  key: CheckoutStageKey
  label: string
  count: number
  conversion_rate: number
}

export type CheckoutSessionSummary = {
  session_id: string
  customer_id: string
  started_at: string | null
  last_at: string | null
  fulfilment_method: "pickup" | "delivery" | null
  max_stage: CheckoutStageKey
  outcome: "completed" | "placed" | "dropped"
  order_ids: string[]
  counts: {
    cart_views: number
    address_submissions: number
    shipping_selections: number
  }
}

export type MemberActivity = {
  summary: {
    sessions: number
    completed_orders: number
    last_fulfilment_method: "pickup" | "delivery" | null
    highest_stage: CheckoutStageKey | null
  }
  sessions: CheckoutSessionSummary[]
  products: Array<{
    product_id: string
    handle: string
    views: number
    cart_adds: number
    last_at: string | null
  }>
  filters: Array<{
    filter: string
    uses: number
    values: string[]
    last_at: string | null
  }>
  pages: Array<{
    path: string
    referrer: string | null
    at: string | null
  }>
}

export type DemandMetrics = {
  top_products: Array<{
    product_id: string
    handle: string
    views: number
    cart_adds: number
    view_to_cart_rate: number
  }>
  top_breweries: Array<{ slug: string; views: number }>
  filter_usage: Array<{ filter: string; count: number }>
  hop_counts: Array<{ hop: string; count: number }>
  untappd_bands: Array<{ band: string; views: number }>
}

export type SearchIntentRow = {
  query: string
  submissions: number
  result_clicks: number
  click_through: number // 0-100
  avg_results: number
  zero_results: number
}

export type AttentionAction = {
  id: string
  severity: "high" | "medium" | "low"
  title: string
  detail: string
  magnitude: number
  magnitude_label: string
  href?: string
}

export const CHECKOUT_STAGE_RANK: Record<CheckoutStageKey, number> = {
  cart: 0,
  fulfilment: 1,
  address: 2,
  shipping: 3,
  payment: 4,
  review: 5,
  placed: 6,
  completed: 7,
}

export const INSIGHTS_EVENT_TYPES = [...ANALYTICS_EVENT_TYPES]

export const MEMBER_ACTIVITY_EVENT_TYPES = [
  "product.viewed",
  "filter.applied",
  "cart.viewed",
  "cart.item_added",
  "checkout.step_reached",
  "checkout.address_submitted",
  "checkout.fulfilment_selected",
  "checkout.shipping_method_selected",
  "order.confirmation_viewed",
  "order.completed",
  "page.viewed",
] as const

function toIso(value: string | Date | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function eventTime(event: AnalyticsEvent): number {
  const iso = toIso(event.created_at)
  return iso ? new Date(iso).getTime() : 0
}

function roundRate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0
  return Math.round((numerator / denominator) * 1000) / 10
}

function sessionBucketKey(event: AnalyticsEvent): string | null {
  const cartId = event.payload?.cart_id
  if (typeof cartId === "string" && cartId) return `cart:${cartId}`
  if (event.session_id) return `session:${event.session_id}`
  if (event.event_type === "order.completed") {
    const orderId = event.payload?.order_id
    if (typeof orderId === "string" && orderId) return `order:${orderId}`
  }
  return null
}

function filterEvents(events: AnalyticsEvent[], since?: Date): AnalyticsEvent[] {
  const merged = mergeSessionCustomers(events)
  if (!since) return merged
  return merged.filter((event) => eventTime(event) >= since.getTime())
}

function inferredMethod(events: AnalyticsEvent[]): "pickup" | "delivery" | null {
  let method: "pickup" | "delivery" | null = null
  for (const event of events) {
    if (event.event_type === "checkout.fulfilment_selected") {
      const selected = event.payload?.method
      if (selected === "pickup" || selected === "delivery") {
        method = selected
      }
    }
  }
  if (method) return method
  if (
    events.some(
      (event) =>
        event.event_type === "checkout.address_submitted" ||
        (event.event_type === "checkout.step_reached" &&
          (event.payload?.step === "address" || event.payload?.step === "shipping")) ||
        event.event_type === "checkout.shipping_method_selected"
    )
  ) {
    return "delivery"
  }
  return null
}

function dedupeOrderIds(events: AnalyticsEvent[]): string[] {
  const ids = new Set<string>()
  for (const event of events) {
    if (event.event_type !== "order.completed") continue
    const orderId = event.payload?.order_id
    if (typeof orderId === "string" && orderId) ids.add(orderId)
  }
  return [...ids]
}

// order.confirmation_viewed fires client-side the instant checkout succeeds —
// unlike order.completed (server, gated on payment.captured), this is not
// delayed for manual payment methods like PayID/cash-on-pickup.
function dedupePlacedOrderIds(events: AnalyticsEvent[]): string[] {
  const ids = new Set<string>()
  for (const event of events) {
    if (event.event_type !== "order.confirmation_viewed") continue
    const orderId = event.payload?.order_id
    if (typeof orderId === "string" && orderId) ids.add(orderId)
  }
  return [...ids]
}

function sessionStageSummary(events: AnalyticsEvent[]): CheckoutSessionSummary | null {
  const sorted = [...events].sort((a, b) => eventTime(a) - eventTime(b))
  const customerId = sorted.find((event) => event.customer_id)?.customer_id
  const sessionId =
    sorted.find((event) => event.payload?.cart_id)?.payload?.cart_id ??
    sorted.find((event) => event.session_id)?.session_id ??
    sorted.find((event) => event.payload?.order_id)?.payload?.order_id
  if (!customerId || !sessionId) return null

  const method = inferredMethod(sorted)
  const cart = sorted.some((event) => event.event_type === "cart.viewed")
  const fulfilment = sorted.some(
    (event) =>
      (event.event_type === "checkout.step_reached" && event.payload?.step === "fulfilment") ||
      event.event_type === "checkout.fulfilment_selected" ||
      event.event_type === "checkout.address_submitted" ||
      event.event_type === "checkout.shipping_method_selected" ||
      (event.event_type === "checkout.step_reached" &&
        (event.payload?.step === "payment" || event.payload?.step === "review")) ||
      event.event_type === "order.completed"
  )
  const address =
    method === "delivery" &&
    sorted.some(
      (event) =>
        (event.event_type === "checkout.step_reached" && event.payload?.step === "address") ||
        event.event_type === "checkout.address_submitted" ||
        event.event_type === "checkout.shipping_method_selected" ||
        (event.event_type === "checkout.step_reached" &&
          (event.payload?.step === "shipping" ||
            event.payload?.step === "payment" ||
            event.payload?.step === "review")) ||
        event.event_type === "order.completed"
    )
  const shipping =
    method === "delivery" &&
    sorted.some(
      (event) =>
        (event.event_type === "checkout.step_reached" && event.payload?.step === "shipping") ||
        event.event_type === "checkout.shipping_method_selected" ||
        (event.event_type === "checkout.step_reached" &&
          (event.payload?.step === "payment" || event.payload?.step === "review")) ||
        event.event_type === "order.completed"
    )
  const payment = sorted.some(
    (event) =>
      (event.event_type === "checkout.step_reached" && event.payload?.step === "payment") ||
      (event.event_type === "checkout.step_reached" && event.payload?.step === "review") ||
      event.event_type === "order.completed"
  )
  const review = sorted.some(
    (event) =>
      (event.event_type === "checkout.step_reached" && event.payload?.step === "review") ||
      event.event_type === "order.completed"
  )
  const orderIds = dedupeOrderIds(sorted)
  const placedOrderIds = dedupePlacedOrderIds(sorted)
  const completed = orderIds.length > 0
  const placed = completed || placedOrderIds.length > 0

  let maxStage: CheckoutStageKey = "cart"
  if (completed) {
    maxStage = "completed"
  } else if (placed) {
    maxStage = "placed"
  } else if (review) {
    maxStage = "review"
  } else if (payment) {
    maxStage = "payment"
  } else if (shipping) {
    maxStage = "shipping"
  } else if (address) {
    maxStage = "address"
  } else if (fulfilment) {
    maxStage = "fulfilment"
  }

  return {
    session_id: sessionId,
    customer_id: customerId,
    started_at: toIso(sorted[0]?.created_at),
    last_at: toIso(sorted[sorted.length - 1]?.created_at),
    fulfilment_method: method,
    max_stage: maxStage,
    outcome: completed ? "completed" : placed ? "placed" : "dropped",
    order_ids: orderIds.length > 0 ? orderIds : placedOrderIds,
    counts: {
      cart_views: sorted.filter((event) => event.event_type === "cart.viewed").length,
      address_submissions: sorted.filter(
        (event) => event.event_type === "checkout.address_submitted"
      ).length,
      shipping_selections: sorted.filter(
        (event) => event.event_type === "checkout.shipping_method_selected"
      ).length,
    },
  }
}

export function buildCheckoutSessionSummaries(
  events: AnalyticsEvent[],
  since?: Date
): CheckoutSessionSummary[] {
  const grouped = new Map<string, AnalyticsEvent[]>()
  const cartToSession = new Map<string, string>()
  const orderToSession = new Map<string, string>()
  for (const event of filterEvents(events, since)) {
    if (!event.customer_id) continue
    let bucketKey: string | null = null
    const orderId =
      event.event_type === "order.completed" && typeof event.payload?.order_id === "string"
        ? event.payload.order_id
        : null
    const cartId = typeof event.payload?.cart_id === "string" ? event.payload.cart_id : null

    if (orderId && orderToSession.has(orderId)) {
      bucketKey = orderToSession.get(orderId) ?? null
    }

    if (!bucketKey && cartId && cartToSession.has(cartId)) {
      bucketKey = cartToSession.get(cartId) ?? null
    }

    if (!bucketKey && event.session_id) {
      bucketKey = `session:${event.session_id}`
    }

    if (!bucketKey) {
      bucketKey = sessionBucketKey(event)
    }

    if (!bucketKey) continue
    const bucket = grouped.get(bucketKey) ?? []
    bucket.push(event)
    grouped.set(bucketKey, bucket)
    if (cartId) {
      cartToSession.set(cartId, bucketKey)
    }
    if (orderId) {
      orderToSession.set(orderId, bucketKey)
    }
  }

  return [...grouped.values()]
    .map((sessionEvents) => sessionStageSummary(sessionEvents))
    .filter((session): session is CheckoutSessionSummary => session != null)
    .sort((a, b) => (b.last_at ?? "").localeCompare(a.last_at ?? ""))
}

export function buildCheckoutFunnel(
  events: AnalyticsEvent[],
  since?: Date
): {
  total_sessions: number
  completed_orders: number
  stages: CheckoutStage[]
  dropped_by_stage: Record<CheckoutStageKey, CheckoutSessionSummary[]>
} {
  const sessions = buildCheckoutSessionSummaries(events, since)
  const cartCount = sessions.filter((session) => session.counts.cart_views > 0).length
  const fulfilmentCount = sessions.filter((session) =>
    ["fulfilment", "address", "shipping", "payment", "review", "placed", "completed"].includes(
      session.max_stage
    )
  ).length
  const deliveryAfterFulfilment = sessions.filter(
    (session) =>
      session.fulfilment_method === "delivery" &&
      ["fulfilment", "address", "shipping", "payment", "review", "placed", "completed"].includes(
        session.max_stage
      )
  )
  const addressCount = sessions.filter(
    (session) =>
      session.fulfilment_method === "delivery" &&
      ["address", "shipping", "payment", "review", "placed", "completed"].includes(
        session.max_stage
      )
  ).length
  const shippingCount = sessions.filter(
    (session) =>
      session.fulfilment_method === "delivery" &&
      ["shipping", "payment", "review", "placed", "completed"].includes(session.max_stage)
  ).length
  const paymentCount = sessions.filter((session) =>
    ["payment", "review", "placed", "completed"].includes(session.max_stage)
  ).length
  const reviewCount = sessions.filter((session) =>
    ["review", "placed", "completed"].includes(session.max_stage)
  ).length
  const placedCount = sessions.filter((session) =>
    ["placed", "completed"].includes(session.max_stage)
  ).length
  const completedCount = sessions.filter((session) => session.outcome === "completed").length

  const pickupOrShippingReady = sessions.filter(
    (session) =>
      (session.fulfilment_method === "delivery" &&
        ["shipping", "payment", "review", "placed", "completed"].includes(session.max_stage)) ||
      (session.fulfilment_method === "pickup" &&
        ["fulfilment", "payment", "review", "placed", "completed"].includes(session.max_stage))
  ).length

  // Group sessions that never progressed past a given stage — i.e. exactly
  // who dropped out where. A session is a "dropout" at its own max_stage
  // (outcome !== "placed"/"completed"); it never reached the next stage.
  const droppedByStage = sessions
    .filter((session) => session.outcome === "dropped")
    .reduce(
      (acc, session) => {
        acc[session.max_stage] = acc[session.max_stage] ?? []
        acc[session.max_stage].push(session)
        return acc
      },
      {} as Record<CheckoutStageKey, CheckoutSessionSummary[]>
    )

  return {
    total_sessions: sessions.length,
    completed_orders: completedCount,
    dropped_by_stage: droppedByStage,
    stages: [
      {
        key: "cart",
        label: "Cart viewed",
        count: cartCount,
        conversion_rate: cartCount > 0 ? 100 : 0,
      },
      {
        key: "fulfilment",
        label: "Fulfilment reached",
        count: fulfilmentCount,
        conversion_rate: roundRate(fulfilmentCount, cartCount),
      },
      {
        key: "address",
        label: "Address submitted",
        count: addressCount,
        conversion_rate: roundRate(addressCount, deliveryAfterFulfilment.length),
      },
      {
        key: "shipping",
        label: "Shipping selected",
        count: shippingCount,
        conversion_rate: roundRate(shippingCount, addressCount),
      },
      {
        key: "payment",
        label: "Payment reached",
        count: paymentCount,
        conversion_rate: roundRate(paymentCount, pickupOrShippingReady),
      },
      {
        key: "review",
        label: "Review reached",
        count: reviewCount,
        conversion_rate: roundRate(reviewCount, paymentCount),
      },
      {
        key: "placed",
        label: "Order placed",
        count: placedCount,
        conversion_rate: roundRate(placedCount, reviewCount),
      },
      {
        key: "completed",
        label: "Payment confirmed",
        count: completedCount,
        conversion_rate: roundRate(completedCount, placedCount),
      },
    ],
  }
}

export function buildDemandMetrics(events: AnalyticsEvent[], since?: Date): DemandMetrics {
  const recent = filterEvents(events, since)
  const productViews = new Map<string, { handle: string; views: number; cart_adds: number }>()
  const breweryViews = new Map<string, number>()
  const filterUsage = new Map<string, number>()
  const hopCounts = new Map<string, number>()
  const untappdBands = new Map<string, number>()

  for (const event of recent) {
    const payload = event.payload ?? {}

    if (event.event_type === "product.viewed") {
      if (payload.product_id) {
        const current = productViews.get(payload.product_id) ?? {
          handle: payload.handle ?? "",
          views: 0,
          cart_adds: 0,
        }
        productViews.set(payload.product_id, {
          ...current,
          views: current.views + 1,
        })
      }
      if (payload.untappd_rating != null) {
        const rating = parseFloat(payload.untappd_rating)
        if (!Number.isNaN(rating)) {
          const floor = Math.floor(rating * 2) / 2
          const band = `${floor.toFixed(1)}–${(floor + 0.5).toFixed(1)}`
          untappdBands.set(band, (untappdBands.get(band) ?? 0) + 1)
        }
      }
    }

    if (event.event_type === "cart.item_added" && payload.product_id) {
      const current = productViews.get(payload.product_id) ?? {
        handle: "",
        views: 0,
        cart_adds: 0,
      }
      productViews.set(payload.product_id, {
        ...current,
        cart_adds: current.cart_adds + 1,
      })
    }

    if (event.event_type === "brewery.viewed" && payload.slug) {
      breweryViews.set(payload.slug as string, (breweryViews.get(payload.slug as string) ?? 0) + 1)
    }

    if (event.event_type === "filter.applied") {
      const filters = (payload.filters ?? {}) as Record<string, string>
      for (const [key, value] of Object.entries(filters)) {
        if (!value) continue
        filterUsage.set(key, (filterUsage.get(key) ?? 0) + 1)
        if (key === "hops") {
          for (const hop of value.split(",")) {
            const cleaned = hop.trim()
            if (cleaned) hopCounts.set(cleaned, (hopCounts.get(cleaned) ?? 0) + 1)
          }
        }
      }
    }
  }

  return {
    top_products: Array.from(productViews.entries())
      .map(([product_id, data]) => ({
        product_id,
        handle: data.handle,
        views: data.views,
        cart_adds: data.cart_adds,
        view_to_cart_rate:
          data.views > 0 ? Math.round((data.cart_adds / data.views) * 100) / 100 : 0,
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
}

export function buildMemberActivity(events: AnalyticsEvent[], customerId: string): MemberActivity {
  const merged = filterEvents(events)
  const memberEvents = merged
    .filter((event) => event.customer_id === customerId)
    .sort((a, b) => eventTime(b) - eventTime(a))
  const sessions = buildCheckoutSessionSummaries(memberEvents)
  const highestStage = sessions.reduce<CheckoutStageKey | null>((best, session) => {
    if (!best) return session.max_stage
    return CHECKOUT_STAGE_RANK[session.max_stage] > CHECKOUT_STAGE_RANK[best]
      ? session.max_stage
      : best
  }, null)

  const products = new Map<
    string,
    { product_id: string; handle: string; views: number; cart_adds: number; last_at: string | null }
  >()
  const filters = new Map<
    string,
    { filter: string; uses: number; values: Set<string>; last_at: string | null }
  >()

  for (const event of memberEvents) {
    const payload = event.payload ?? {}
    const createdAt = toIso(event.created_at)

    if (
      (event.event_type === "product.viewed" || event.event_type === "cart.item_added") &&
      payload.product_id
    ) {
      const current = products.get(payload.product_id) ?? {
        product_id: payload.product_id,
        handle: payload.handle ?? "",
        views: 0,
        cart_adds: 0,
        last_at: createdAt,
      }
      products.set(payload.product_id, {
        ...current,
        handle: current.handle || payload.handle || "",
        views: current.views + (event.event_type === "product.viewed" ? 1 : 0),
        cart_adds: current.cart_adds + (event.event_type === "cart.item_added" ? 1 : 0),
        last_at:
          current.last_at && createdAt && current.last_at > createdAt ? current.last_at : createdAt,
      })
    }

    if (event.event_type === "filter.applied") {
      const applied = (payload.filters ?? {}) as Record<string, string>
      for (const [key, value] of Object.entries(applied)) {
        if (!value) continue
        const current = filters.get(key) ?? {
          filter: key,
          uses: 0,
          values: new Set<string>(),
          last_at: createdAt,
        }
        current.uses += 1
        for (const item of value.split(",")) {
          const cleaned = item.trim()
          if (cleaned) current.values.add(cleaned)
        }
        current.last_at =
          current.last_at && createdAt && current.last_at > createdAt ? current.last_at : createdAt
        filters.set(key, current)
      }
    }
  }

  return {
    summary: {
      sessions: sessions.length,
      completed_orders: sessions.reduce((total, session) => total + session.order_ids.length, 0),
      last_fulfilment_method: sessions[0]?.fulfilment_method ?? null,
      highest_stage: highestStage,
    },
    sessions: sessions.slice(0, 10),
    products: Array.from(products.values())
      .sort((a, b) => b.views + b.cart_adds - (a.views + a.cart_adds))
      .slice(0, 10),
    filters: Array.from(filters.values())
      .map((entry) => ({
        filter: entry.filter,
        uses: entry.uses,
        values: [...entry.values].sort(),
        last_at: entry.last_at,
      }))
      .sort((a, b) => b.uses - a.uses)
      .slice(0, 10),
    pages: memberEvents
      .filter(
        (event) => event.event_type === "page.viewed" && typeof event.payload?.path === "string"
      )
      .slice(0, 50)
      .map((event) => ({
        path: event.payload!.path as string,
        referrer: typeof event.payload?.referrer === "string" ? event.payload.referrer : null,
        at: toIso(event.created_at),
      })),
  }
}

export function buildProductDrilldown(
  events: AnalyticsEvent[],
  productId: string,
  since?: Date
): Array<{
  customer_id: string | null
  session_id: string | null
  views: number
  cart_adds: number
  last_at: string | null
}> {
  const members = new Map<
    string,
    {
      customer_id: string | null
      session_id: string | null
      views: number
      cart_adds: number
      last_at: string | null
    }
  >()

  for (const event of filterEvents(events, since)) {
    const payload = event.payload ?? {}
    if (payload.product_id !== productId) continue
    if (event.event_type !== "product.viewed" && event.event_type !== "cart.item_added") continue

    // Group by customer when known; otherwise by session, so anonymous
    // browsing (the majority of traffic) still shows up instead of being
    // silently dropped.
    const groupKey = event.customer_id
      ? `cust:${event.customer_id}`
      : `sess:${event.session_id ?? "unknown"}`
    const current = members.get(groupKey) ?? {
      customer_id: event.customer_id ?? null,
      session_id: event.customer_id ? null : (event.session_id ?? null),
      views: 0,
      cart_adds: 0,
      last_at: toIso(event.created_at),
    }
    current.views += event.event_type === "product.viewed" ? 1 : 0
    current.cart_adds += event.event_type === "cart.item_added" ? 1 : 0
    const createdAt = toIso(event.created_at)
    current.last_at =
      current.last_at && createdAt && current.last_at > createdAt ? current.last_at : createdAt
    members.set(groupKey, current)
  }

  return Array.from(members.values()).sort(
    (a, b) => b.views + b.cart_adds - (a.views + a.cart_adds)
  )
}

export function buildFilterDrilldown(
  events: AnalyticsEvent[],
  filterKey: string,
  since?: Date
): {
  values: Array<{ value: string; count: number }>
  members: Array<{
    customer_id: string | null
    session_id: string | null
    uses: number
    values: string[]
    last_at: string | null
  }>
} {
  const values = new Map<string, number>()
  const members = new Map<
    string,
    {
      customer_id: string | null
      session_id: string | null
      uses: number
      values: Set<string>
      last_at: string | null
    }
  >()

  for (const event of filterEvents(events, since)) {
    if (event.event_type !== "filter.applied") continue
    const raw = event.payload?.filters?.[filterKey]
    if (typeof raw !== "string" || !raw.trim()) continue
    const createdAt = toIso(event.created_at)
    const groupKey = event.customer_id
      ? `cust:${event.customer_id}`
      : `sess:${event.session_id ?? "unknown"}`
    const current = members.get(groupKey) ?? {
      customer_id: event.customer_id ?? null,
      session_id: event.customer_id ? null : (event.session_id ?? null),
      uses: 0,
      values: new Set<string>(),
      last_at: createdAt,
    }
    current.uses += 1
    for (const item of raw.split(",")) {
      const cleaned = item.trim()
      if (!cleaned) continue
      current.values.add(cleaned)
      values.set(cleaned, (values.get(cleaned) ?? 0) + 1)
    }
    current.last_at =
      current.last_at && createdAt && current.last_at > createdAt ? current.last_at : createdAt
    members.set(groupKey, current)
  }

  return {
    values: Array.from(values.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count),
    members: Array.from(members.values())
      .map((member) => ({
        customer_id: member.customer_id,
        session_id: member.session_id,
        uses: member.uses,
        values: [...member.values].sort(),
        last_at: member.last_at,
      }))
      .sort((a, b) => b.uses - a.uses),
  }
}

export function buildSearchIntent(events: AnalyticsEvent[], since?: Date): SearchIntentRow[] {
  const merged = filterEvents(events, since)
  const subs = new Map<string, { n: number; zero: number; results: number }>()
  const clicks = new Map<string, number>()
  for (const event of merged) {
    const query =
      typeof event.payload?.query_normalized === "string" ? event.payload.query_normalized : null
    if (!query) continue
    if (event.event_type === "search.submitted") {
      const current = subs.get(query) ?? { n: 0, zero: 0, results: 0 }
      current.n++
      const resultCount = Number(event.payload?.result_count)
      if (resultCount === 0) current.zero++
      current.results += Number.isFinite(resultCount) ? resultCount : 0
      subs.set(query, current)
    } else if (event.event_type === "search.result_clicked") {
      clicks.set(query, (clicks.get(query) ?? 0) + 1)
    }
  }
  return Array.from(subs.entries())
    .map(([query, data]) => ({
      query,
      submissions: data.n,
      result_clicks: clicks.get(query) ?? 0,
      click_through: data.n > 0 ? Math.round(((clicks.get(query) ?? 0) / data.n) * 100) : 0,
      avg_results: data.n > 0 ? Math.round(data.results / data.n) : 0,
      zero_results: data.zero,
    }))
    .sort((a, b) => b.submissions - a.submissions)
    .slice(0, 15)
}

// Products with strong exposure (views) but little-to-no conversion (cart adds).
// These are the "interest without intent" cases worth an attention row.
export function buildInterestingProducts(
  events: AnalyticsEvent[],
  since?: Date,
  minViews = 20
): Array<{
  product_id: string
  handle: string
  views: number
  cart_adds: number
  view_to_cart_rate: number
}> {
  const merged = filterEvents(events, since)
  const byProduct = new Map<string, { handle: string; views: number; cart_adds: number }>()
  for (const event of merged) {
    const payload = event.payload ?? {}
    if (!payload.product_id) continue
    const current = byProduct.get(payload.product_id) ?? {
      handle: typeof payload.handle === "string" ? payload.handle : "",
      views: 0,
      cart_adds: 0,
    }
    if (event.event_type === "product.viewed") current.views++
    if (event.event_type === "cart.item_added") current.cart_adds++
    if (current.handle || typeof payload.handle === "string") {
      current.handle = current.handle || (typeof payload.handle === "string" ? payload.handle : "")
    }
    byProduct.set(payload.product_id, current)
  }
  return Array.from(byProduct.entries())
    .map(([product_id, data]) => ({
      product_id,
      handle: data.handle,
      views: data.views,
      cart_adds: data.cart_adds,
      view_to_cart_rate: data.views > 0 ? Math.round((data.cart_adds / data.views) * 100) / 100 : 0,
    }))
    .filter((p) => p.views >= minViews)
    .sort((a, b) => b.views - a.views)
    .slice(0, 10)
}
