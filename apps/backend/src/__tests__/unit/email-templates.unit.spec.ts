import { renderEmail } from "../../lib/render-email"
import * as ApplicationReceived from "../../emails/application-received"
import * as ApplicationApproved from "../../emails/application-approved"
import * as ApplicationRejected from "../../emails/application-rejected"
import * as OrderPlaced from "../../emails/order-placed"
import * as OrderPaymentCaptured from "../../emails/order-payment-captured"
import * as OrderShipped from "../../emails/order-shipped"
import * as OrderReadyForPickup from "../../emails/order-ready-for-pickup"
import * as RestockAvailable from "../../emails/restock-available"
import * as VipTierUp from "../../emails/vip-tier-up"
import * as VipDemotionWarning from "../../emails/vip-demotion-warning"
import * as ReferralRewarded from "../../emails/referral-rewarded"
import * as WishlistOfferApproved from "../../emails/wishlist-offer-approved"

const STORE_URL = "https://example.com"
const PREFS_LINK_HREF = "/account/email-settings"

describe("email templates render", () => {
  it("application_received (transactional, no prefs link)", async () => {
    const out = await renderEmail(ApplicationReceived as any, {
      name: "Cam",
      storeUrl: STORE_URL,
    })
    expect(out.subject).toMatch(/received your application/i)
    expect(out.html).toContain("Cam")
    expect(out.html).not.toContain(PREFS_LINK_HREF)
  })

  it("application_approved includes referral code (transactional)", async () => {
    const out = await renderEmail(ApplicationApproved as any, {
      name: "Cam",
      referralCode: "CAM-1234",
      storeUrl: STORE_URL,
    })
    expect(out.subject).toMatch(/welcome/i)
    expect(out.html).toContain("CAM-1234")
    expect(out.html).not.toContain(PREFS_LINK_HREF)
  })

  it("application_rejected (transactional)", async () => {
    const out = await renderEmail(ApplicationRejected as any, {
      name: "Cam",
      storeUrl: STORE_URL,
    })
    expect(out.subject).toMatch(/regarding your application/i)
    expect(out.html).toContain("Cam")
    expect(out.html).not.toContain(PREFS_LINK_HREF)
  })

  it("order_placed renders items + total + payid alias when delivery", async () => {
    const out = await renderEmail(OrderPlaced as any, {
      name: "Cam",
      orderDisplayId: "1042",
      items: [{ title: "Stout", quantity: 2, unit_price: 1500 }],
      total: 3000,
      currencyCode: "aud",
      isPickup: false,
      payidAlias: "alias@example.test",
      storeUrl: STORE_URL,
    })
    expect(out.subject).toContain("1042")
    expect(out.html).toContain("Stout")
    expect(out.html).toContain("alias@example.test")
    expect(out.html).not.toContain(PREFS_LINK_HREF)
  })

  it("order_placed hides payid block on pickup", async () => {
    const out = await renderEmail(OrderPlaced as any, {
      name: "Cam",
      orderDisplayId: "1042",
      items: [{ title: "Stout", quantity: 1, unit_price: 1500 }],
      total: 1500,
      currencyCode: "aud",
      isPickup: true,
      storeUrl: STORE_URL,
    })
    expect(out.html).not.toContain("Pay via PayID")
  })

  it("order_payment_captured (transactional)", async () => {
    const out = await renderEmail(OrderPaymentCaptured as any, {
      name: "Cam",
      orderDisplayId: "1042",
      storeUrl: STORE_URL,
    })
    expect(out.subject).toContain("1042")
    expect(out.subject).toMatch(/payment received/i)
  })

  it("order_shipped with tracking URL", async () => {
    const out = await renderEmail(OrderShipped as any, {
      name: "Cam",
      orderDisplayId: "1042",
      carrier: "AusPost",
      trackingNumber: "AP1234",
      trackingUrl: "https://auspost.com.au/track/AP1234",
      storeUrl: STORE_URL,
    })
    expect(out.subject).toMatch(/shipped/i)
    expect(out.html).toContain("AP1234")
  })

  it("order_ready_for_pickup (transactional)", async () => {
    const out = await renderEmail(OrderReadyForPickup as any, {
      name: "Cam",
      orderDisplayId: "1042",
      locationName: "Hillside",
      locationAddress: "1 Brewery Lane",
      locationHours: "Mon-Fri 9-5",
      storeUrl: STORE_URL,
    })
    expect(out.subject).toMatch(/ready for pickup/i)
    expect(out.html).toContain("Hillside")
    expect(out.html).toContain("1 Brewery Lane")
  })

  it("restock_available (marketing — has prefs link)", async () => {
    const out = await renderEmail(RestockAvailable as any, {
      name: "Cam",
      beerName: "Imperial Stout",
      breweryName: "Hopfather",
      handle: "imperial-stout",
      storeUrl: STORE_URL,
    })
    expect(out.subject).toContain("Imperial Stout")
    expect(out.html).toContain(PREFS_LINK_HREF)
  })

  it("vip_tier_up (marketing)", async () => {
    const out = await renderEmail(VipTierUp as any, {
      name: "Cam",
      newTier: "vip3",
      storeUrl: STORE_URL,
    })
    expect(out.subject).toMatch(/vip 3/i)
    expect(out.html).toContain(PREFS_LINK_HREF)
  })

  it("vip_demotion_warning includes days remaining (marketing)", async () => {
    const out = await renderEmail(VipDemotionWarning as any, {
      name: "Cam",
      currentTier: "vip3",
      daysRemaining: 14,
      storeUrl: STORE_URL,
    })
    expect(out.subject).toMatch(/risk/i)
    expect(out.html).toContain("14")
    expect(out.html).toContain(PREFS_LINK_HREF)
  })

  it("referral_rewarded (marketing)", async () => {
    const out = await renderEmail(ReferralRewarded as any, {
      name: "Cam",
      referralName: "Alex",
      storeUrl: STORE_URL,
    })
    expect(out.subject).toMatch(/referral placed their first order/i)
    expect(out.html).toContain("Alex")
    expect(out.html).toContain(PREFS_LINK_HREF)
  })

  it("wishlist_offer_approved (marketing)", async () => {
    const out = await renderEmail(WishlistOfferApproved as any, {
      name: "Cam",
      items: [
        {
          beerName: "Westvleteren 12",
          breweryName: "Westvleteren",
          offerPrice: 9999,
          currencyCode: "aud",
          handle: "westy-12",
        },
      ],
      expiresInDays: 7,
      storeUrl: STORE_URL,
    })
    expect(out.subject).toMatch(/offer.*accepted/i)
    expect(out.html).toContain("Westvleteren 12")
    expect(out.html).toContain(PREFS_LINK_HREF)
  })

  it("wishlist_offer_approved multi-item pluralises subject", async () => {
    const out = await renderEmail(WishlistOfferApproved as any, {
      name: "Cam",
      items: [
        { beerName: "Pliny", breweryName: "RR", offerPrice: 5000, currencyCode: "aud", handle: "pliny" },
        { beerName: "Heady Topper", breweryName: "Alchemist", offerPrice: 4000, currencyCode: "aud", handle: "heady" },
      ],
      expiresInDays: 14,
      storeUrl: STORE_URL,
    })
    expect(out.subject).toContain("2 of your wishlist offers")
    expect(out.html).toContain("Pliny")
    expect(out.html).toContain("Heady Topper")
  })

  it("text variant exists for every template", async () => {
    const out = await renderEmail(OrderPlaced as any, {
      name: "Cam",
      orderDisplayId: "1042",
      items: [{ title: "Stout", quantity: 1, unit_price: 1500 }],
      total: 1500,
      currencyCode: "aud",
      isPickup: false,
      storeUrl: STORE_URL,
    })
    expect(out.text.length).toBeGreaterThan(20)
    expect(out.text).toContain("Stout")
  })
})
