import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { getStoreUrl, refreshEmailConfig } from "./email"
import { getLowestVariantPrice } from "./wishlist-price"

/**
 * Sample-data fetchers for the admin "Email Templates" preview page.
 *
 * Each function pulls the single most recent real record needed to render a
 * template with realistic data. When no matching record exists (empty/dev
 * DB) or the field can only be produced by a live, side-effecting trigger
 * (ephemeral tokens, workflow-computed values), it falls back to the same
 * default values the template component itself uses — and lists those field
 * names in `_synthetic` so the admin UI can label them.
 *
 * Field mappings mirror the real subscribers/jobs/workflows exactly (see
 * src/subscribers, src/jobs, src/workflows) — including where amounts are
 * passed through unmodified (order totals/unit prices, already in the unit
 * this app's templates expect) vs. formatted as dollar strings (wishlist
 * price alerts, via getLowestVariantPrice which returns dollars).
 */

export type PreviewResult<P> = {
  props: P
  synthetic: string[]
}

async function mostRecentCustomer(container: any): Promise<any | null> {
  const customerModule = container.resolve(Modules.CUSTOMER)
  const [customer] = await customerModule.listCustomers(
    {},
    { order: { created_at: "DESC" }, take: 1 }
  )
  return customer || null
}

// --- application-received / application-approved / application-rejected ---

async function customerWithStatus(container: any, status: string): Promise<any | null> {
  const customerModule = container.resolve(Modules.CUSTOMER)
  const batch = await customerModule.listCustomers({}, { order: { created_at: "DESC" }, take: 50 })
  return batch.find((c: any) => (c.metadata as any)?.status === status) || null
}

export async function getApplicationReceivedSample(container: any) {
  const storeUrl = getStoreUrl()
  const customer = await customerWithStatus(container, "pending")
  const synthetic: string[] = []
  if (!customer) synthetic.push("name")
  return {
    props: { name: customer?.first_name || "Alex", storeUrl },
    synthetic,
  }
}

export async function getApplicationApprovedSample(container: any) {
  const storeUrl = getStoreUrl()
  const customer = await customerWithStatus(container, "approved")
  const synthetic: string[] = []
  if (!customer) synthetic.push("name")
  const referralCode = (customer?.metadata as any)?.referral_code
  if (!referralCode) synthetic.push("referralCode")
  return {
    props: {
      name: customer?.first_name || "Alex",
      referralCode: referralCode || "ALEX2024",
      storeUrl,
    },
    synthetic,
  }
}

export async function getApplicationRejectedSample(container: any) {
  const storeUrl = getStoreUrl()
  const customer = await customerWithStatus(container, "rejected")
  const synthetic: string[] = []
  if (!customer) synthetic.push("name")
  return {
    props: { name: customer?.first_name || "Alex", storeUrl },
    synthetic,
  }
}

// --- order-placed / order-payment-captured ---

async function mostRecentOrderRaw(container: any) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "email",
      "display_id",
      "customer_id",
      "customer.first_name",
      "shipping_address.first_name",
      "billing_address.first_name",
      "total",
      "currency_code",
      "items.title",
      "items.product_title",
      "items.quantity",
      "items.unit_price",
      "shipping_methods.name",
      "payment_collections.payments.provider_id",
    ],
    pagination: { take: 1, order: { created_at: "DESC" } },
  })
  return orders[0] as any
}

export async function getOrderPlacedSample(container: any) {
  const storeUrl = getStoreUrl()
  const order = await mostRecentOrderRaw(container)
  const synthetic: string[] = []

  if (!order) {
    return {
      props: {
        name: "Alex",
        orderDisplayId: "1234",
        items: [
          { title: "Hill Farmstead Everett · 750ml", quantity: 1, unit_price: 42 },
          { title: "Cantillon Gueuze · 375ml", quantity: 2, unit_price: 38 },
        ],
        total: 118,
        currencyCode: "aud",
        isPickup: false,
        isCash: false,
        payidAlias: "payments@hopsandglory.au",
        holdHours: 24,
        ordersEmail: "orders@hopsandglory.au",
        storeUrl,
      },
      synthetic: ["name", "orderDisplayId", "items", "total", "currencyCode", "isPickup"],
    }
  }

  const name =
    order.customer?.first_name ||
    order.shipping_address?.first_name ||
    order.billing_address?.first_name ||
    "Collector"
  if (!order.customer?.first_name && !order.shipping_address?.first_name) synthetic.push("name")

  const items = (order.items || []).map((it: any) => ({
    title: it.title || it.product_title || "Item",
    quantity: it.quantity || 1,
    unit_price: it.unit_price || 0,
  }))
  const isPickup = (order.shipping_methods || []).some((sm: any) =>
    (sm.name || "").toLowerCase().includes("pickup")
  )
  const payments = (order.payment_collections || []).flatMap((pc: any) => pc?.payments || [])
  const isCash = payments.some(
    (p: any) => typeof p.provider_id === "string" && p.provider_id.startsWith("pp_system_default")
  )
  const isPayId = payments.some(
    (p: any) => typeof p.provider_id === "string" && p.provider_id.startsWith("pp_payid")
  )

  return {
    props: {
      name,
      orderDisplayId: String(order.display_id ?? order.id),
      items,
      total: Number(order.total ?? 0) || 0,
      currencyCode: order.currency_code || "aud",
      isPickup,
      isCash,
      payidAlias: isPayId ? "payments@hopsandglory.au" : undefined,
      holdHours: 24,
      ordersEmail: "orders@hopsandglory.au",
      storeUrl,
    },
    synthetic,
  }
}

export async function getOrderPaymentCapturedSample(container: any) {
  const storeUrl = getStoreUrl()
  const order = await mostRecentOrderRaw(container)
  if (!order) {
    return {
      props: { name: "Alex", orderDisplayId: "1234", storeUrl },
      synthetic: ["name", "orderDisplayId"],
    }
  }
  const name =
    order.customer?.first_name ||
    order.shipping_address?.first_name ||
    order.billing_address?.first_name ||
    "Collector"
  return {
    props: { name, orderDisplayId: String(order.display_id ?? order.id), storeUrl },
    synthetic: [],
  }
}

// --- order-shipped ---

export async function getOrderShippedSample(container: any) {
  const storeUrl = getStoreUrl()
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const [fulfillment] = await fulfillmentModule.listFulfillments(
    {},
    { order: { created_at: "DESC" }, take: 1 }
  )

  if (!fulfillment) {
    return {
      props: {
        name: "Alex",
        orderDisplayId: "1234",
        carrier: "Australia Post",
        trackingNumber: "1Z999AA1012345678",
        trackingUrl: undefined,
        storeUrl,
      },
      synthetic: ["name", "orderDisplayId", "carrier", "trackingNumber"],
    }
  }

  const { data: links } = await query.graph({
    entity: "order_fulfillment",
    fields: ["order_id"],
    filters: { fulfillment_id: fulfillment.id } as any,
  })
  const orderId = (links?.[0] as any)?.order_id
  const synthetic: string[] = []
  let name = "Alex"
  let orderDisplayId = "1234"

  if (orderId) {
    const orderModule = container.resolve(Modules.ORDER)
    const order = await orderModule.retrieveOrder(orderId)
    name = (order as any).first_name || "Collector"
    orderDisplayId = String(order.display_id ?? order.id)
  } else {
    synthetic.push("name", "orderDisplayId")
  }

  const labels = (fulfillment as any).labels || []
  return {
    props: {
      name,
      orderDisplayId,
      carrier: (fulfillment as any).provider_id,
      trackingNumber: labels[0]?.tracking_number,
      trackingUrl: labels[0]?.url,
      storeUrl,
    },
    synthetic,
  }
}

// --- order-ready-for-pickup ---

export async function getOrderReadyForPickupSample(container: any) {
  const storeUrl = getStoreUrl()
  const order = await mostRecentOrderRaw(container)
  const synthetic: string[] = []

  if (!order) {
    return {
      props: {
        name: "Alex",
        orderDisplayId: "1234",
        locationName: "Hops & Glory Fitzroy",
        locationAddress: "282 Brunswick St, Fitzroy VIC 3065",
        locationHours: "Mon-Sat 10am-6pm",
        storeUrl,
      },
      synthetic: ["name", "orderDisplayId", "locationName", "locationAddress", "locationHours"],
    }
  }

  const name =
    order.customer?.first_name ||
    order.shipping_address?.first_name ||
    order.billing_address?.first_name ||
    "Collector"

  const orderModule = container.resolve(Modules.ORDER)
  const fullOrder = await orderModule.retrieveOrder(order.id)
  const snapshot = (fullOrder.metadata as any)?.pickup_location

  if (!snapshot) synthetic.push("locationName", "locationAddress", "locationHours")

  return {
    props: {
      name,
      orderDisplayId: String(order.display_id ?? order.id),
      locationName: snapshot?.name || "Hops & Glory Fitzroy",
      locationAddress:
        [snapshot?.address_line, snapshot?.suburb, snapshot?.postcode].filter(Boolean).join(", ") ||
        "282 Brunswick St, Fitzroy VIC 3065",
      locationHours: snapshot?.hours_summary || "Mon-Sat 10am-6pm",
      storeUrl,
    },
    synthetic,
  }
}

// --- restock-available ---

export async function getRestockAvailableSample(container: any) {
  const storeUrl = getStoreUrl()
  const restockAlertService = container.resolve("restockAlert") as any
  const customerModule = container.resolve(Modules.CUSTOMER)
  const productModule = container.resolve(Modules.PRODUCT)

  const [alert] = await restockAlertService.listRestockAlerts(
    {},
    { order: { created_at: "DESC" }, take: 1 }
  )

  if (!alert) {
    return {
      props: {
        name: "Alex",
        beerName: "Hill Farmstead Everett",
        breweryName: "Hill Farmstead Brewery",
        handle: "hill-farmstead-everett",
        storeUrl,
      },
      synthetic: ["name", "beerName", "breweryName", "handle"],
    }
  }

  const synthetic: string[] = []
  const [customer] = await customerModule.listCustomers({ id: alert.customer_id })
  if (!customer) synthetic.push("name")

  let handle = ""
  if (alert.product_id) {
    const [product] = await productModule.listProducts(
      { id: alert.product_id },
      { select: ["id", "handle"] }
    )
    handle = product?.handle || ""
  }
  if (!handle) synthetic.push("handle")

  return {
    props: {
      name: customer?.first_name || "Collector",
      beerName: alert.beer_name,
      breweryName: alert.brewery_name,
      handle: handle || "hill-farmstead-everett",
      storeUrl,
    },
    synthetic,
  }
}

// --- new-drop ---

export async function getNewDropSample(container: any) {
  const storeUrl = getStoreUrl()
  const productModule = container.resolve(Modules.PRODUCT)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const synthetic: string[] = ["reason"] // reason depends on the specific follow/alert match, always synthesized

  const [product] = await productModule.listProducts(
    { status: "published" },
    { select: ["id", "title", "handle", "metadata"], order: { created_at: "DESC" }, take: 1 }
  )

  if (!product) {
    return {
      props: {
        name: "Alex",
        beerName: "Julius",
        breweryName: "Tree House Brewing",
        reason: "a brewery you follow",
        handle: "tree-house-julius",
        storeUrl,
      },
      synthetic: ["name", "beerName", "breweryName", "handle", "reason"],
    }
  }

  const { data } = await query.graph({
    entity: "product",
    fields: ["breweries.id", "breweries.name"],
    filters: { id: product.id },
  })
  const breweries = ((data?.[0] as any)?.breweries || []).filter((b: any) => b?.id)
  const breweryName = breweries[0]?.name || (product as any).metadata?.brewery || ""
  if (!breweryName) synthetic.push("breweryName")

  const customer = await mostRecentCustomer(container)
  if (!customer) synthetic.push("name")

  return {
    props: {
      name: customer?.first_name || "Alex",
      beerName: product.title || "New release",
      breweryName: breweryName || "Tree House Brewing",
      reason: "a brewery you follow",
      handle: product.handle || "",
      storeUrl,
    },
    synthetic,
  }
}

// --- wishlist-low-stock ---

export async function getWishlistLowStockSample(container: any) {
  const storeUrl = getStoreUrl()
  const wishlistService = container.resolve("wishlist") as any
  const productModule = container.resolve(Modules.PRODUCT)
  const customerModule = container.resolve(Modules.CUSTOMER)

  const [item] = await wishlistService.listWishlists(
    { mode: "buy_later" },
    { order: { created_at: "DESC" }, take: 1 }
  )

  if (!item) {
    return {
      props: {
        name: "Alex",
        beerName: "Cloudwater DIPA",
        stockRemaining: 3,
        handle: "cloudwater-dipa",
        storeUrl,
      },
      synthetic: ["name", "beerName", "stockRemaining", "handle"],
    }
  }

  const synthetic: string[] = []
  const [product] = await productModule.listProducts(
    { id: item.product_id },
    { select: ["id", "title", "handle", "variants"], relations: ["variants"] }
  )
  const [customer] = await customerModule.listCustomers({ id: item.customer_id })
  if (!customer) synthetic.push("name")

  const totalInventory = (product?.variants || []).reduce(
    (sum: number, v: any) => sum + (v.inventory_quantity ?? 0),
    0
  )

  return {
    props: {
      name: customer?.first_name || "Collector",
      beerName: product?.title || "",
      stockRemaining: totalInventory,
      handle: product?.handle || "",
      storeUrl,
    },
    synthetic,
  }
}

// --- wishlist-price-alert ---

export async function getWishlistPriceAlertSample(container: any) {
  const storeUrl = getStoreUrl()
  const wishlistService = container.resolve("wishlist") as any
  const customerModule = container.resolve(Modules.CUSTOMER)

  const [item] = await wishlistService.listWishlists(
    { mode: "buy_at_price" },
    { order: { created_at: "DESC" }, take: 1 }
  )

  if (!item) {
    return {
      props: {
        name: "Alex",
        beerName: "Cloudwater DIPA",
        currentPrice: "38.00",
        targetPrice: "45.00",
        handle: "cloudwater-dipa",
        storeUrl,
      },
      synthetic: ["name", "beerName", "currentPrice", "targetPrice", "handle"],
    }
  }

  const synthetic: string[] = []
  const priced = await getLowestVariantPrice(container, item.product_id)
  const [customer] = await customerModule.listCustomers({ id: item.customer_id })
  if (!customer) synthetic.push("name")
  if (!priced) synthetic.push("currentPrice", "beerName", "handle")

  return {
    props: {
      name: customer?.first_name || "Collector",
      beerName: priced?.product?.title || "",
      currentPrice: priced ? `$${priced.lowestPrice.toFixed(2)}` : "38.00",
      targetPrice: `$${Number(item.target_price ?? 0).toFixed(2)}`,
      handle: priced?.product?.handle || "",
      storeUrl,
    },
    synthetic,
  }
}

// --- wishlist-offer-approved ---

export async function getWishlistOfferApprovedSample(container: any) {
  const storeUrl = getStoreUrl()
  const wishlistService = container.resolve("wishlist") as any
  const customerModule = container.resolve(Modules.CUSTOMER)
  const productModule = container.resolve(Modules.PRODUCT)

  const [latest] = await wishlistService.listWishlists(
    { admin_approved_offer: true },
    { order: { updated_at: "DESC" }, take: 1 }
  )

  if (!latest) {
    return {
      props: {
        name: "Alex",
        items: [
          {
            beerName: "Cloudwater DIPA",
            breweryName: "Cloudwater Brew Co",
            offerPrice: 35,
            currencyCode: "aud",
            handle: "cloudwater-dipa",
          },
        ],
        expiresInDays: 7,
        storeUrl,
      },
      synthetic: ["name", "items", "expiresInDays"],
    }
  }

  const synthetic: string[] = []
  const rows = await wishlistService.listWishlists(
    { admin_approved_offer: true, customer_id: latest.customer_id },
    { order: { updated_at: "DESC" }, take: 5 }
  )
  const [customer] = await customerModule.listCustomers({ id: latest.customer_id })
  if (!customer) synthetic.push("name")

  const items = []
  for (const row of rows) {
    const [product] = await productModule.listProducts(
      { id: row.product_id },
      { select: ["id", "title", "handle", "metadata"] }
    )
    items.push({
      beerName: product?.title || "",
      breweryName: (product as any)?.metadata?.brewery_name || "",
      offerPrice: row.admin_offer_price ?? 0,
      currencyCode: "aud",
      handle: product?.handle || "",
    })
  }

  const expiresInDays = latest.admin_offer_expires_at
    ? Math.max(
        0,
        Math.ceil(
          (new Date(latest.admin_offer_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      )
    : null
  if (expiresInDays == null) synthetic.push("expiresInDays")

  return {
    props: {
      name: customer?.first_name || "Collector",
      items,
      expiresInDays,
      storeUrl,
    },
    synthetic,
  }
}

// --- vip-tier-up ---

export async function getVipTierUpSample(container: any) {
  const storeUrl = getStoreUrl()
  const customer = await mostRecentCustomer(container)
  return {
    props: {
      name: customer?.first_name || "Alex",
      newTier: "vip2",
      storeUrl,
    },
    synthetic: customer ? ["newTier"] : ["name", "newTier"],
  }
}

// --- vip-demotion-warning ---

export async function getVipDemotionWarningSample(container: any) {
  const storeUrl = getStoreUrl()
  const vipScoreService = container.resolve("vipScore") as any
  const customerModule = container.resolve(Modules.CUSTOMER)

  const scores = await vipScoreService.listVipScores(
    {},
    { order: { updated_at: "DESC" }, take: 20 }
  )
  const atRisk = (scores || []).find(
    (s: any) => s.current_tier !== "approved" && s.current_tier !== "pending"
  )

  if (!atRisk) {
    return {
      props: { name: "Alex", currentTier: "vip2", daysRemaining: 14, storeUrl },
      synthetic: ["name", "currentTier", "daysRemaining"],
    }
  }

  const [customer] = await customerModule.listCustomers({ id: atRisk.customer_id })
  return {
    props: {
      name: customer?.first_name || "Collector",
      currentTier: atRisk.current_tier,
      daysRemaining: 14,
      storeUrl,
    },
    synthetic: customer ? ["daysRemaining"] : ["name", "daysRemaining"],
  }
}

// --- referral-rewarded ---

export async function getReferralRewardedSample(container: any) {
  const storeUrl = getStoreUrl()
  const referralService = container.resolve("referral") as any
  const customerModule = container.resolve(Modules.CUSTOMER)

  const referrals = await referralService.listReferrals(
    {},
    { order: { created_at: "DESC" }, take: 20 }
  )
  const referral = (referrals || []).find((r: any) => !r.reward_sent_at) || referrals?.[0]

  if (!referral) {
    return {
      props: { name: "Alex", referralName: "Jordan", storeUrl },
      synthetic: ["name", "referralName"],
    }
  }

  const [referrer] = await customerModule.listCustomers({ id: referral.referrer_customer_id })
  const [referred] = await customerModule.listCustomers({ id: referral.referred_customer_id })
  const synthetic: string[] = []
  if (!referrer) synthetic.push("name")
  if (!referred) synthetic.push("referralName")

  return {
    props: {
      name: referrer?.first_name || "Alex",
      referralName: referred?.first_name || "Jordan",
      storeUrl,
    },
    synthetic,
  }
}

// --- password-reset (token is ephemeral crypto, never stored — synthesized) ---

export async function getPasswordResetSample(container: any) {
  const storeUrl = getStoreUrl()
  const customer = await mostRecentCustomer(container)
  return {
    props: {
      name: customer?.first_name || "there",
      resetUrl: `${storeUrl}/reset-password?token=preview-token-000`,
      storeUrl,
    },
    synthetic: customer ? ["resetUrl"] : ["name", "resetUrl"],
  }
}

// --- customer-email-change (token requires a side-effecting call — synthesized) ---

export async function getCustomerEmailChangeSample(container: any) {
  const storeUrl = getStoreUrl()
  const customer = await mostRecentCustomer(container)
  return {
    props: {
      name: customer?.first_name || "Alex",
      newEmail: "preview@example.com",
      verifyUrl: `${storeUrl}/verify-email?token=preview-token-000`,
      storeUrl,
      expiresInHours: 24,
    },
    synthetic: customer
      ? ["newEmail", "verifyUrl", "expiresInHours"]
      : ["name", "newEmail", "verifyUrl", "expiresInHours"],
  }
}

export async function refreshEmailPreviewConfig(container: any) {
  await refreshEmailConfig(container)
}
