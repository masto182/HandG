import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { WISHLIST_MODULE } from "../modules/wishlist"
import { refreshEmailConfig, sendTemplate, getStoreUrl } from "../lib/email"
import * as WishlistOfferApprovedTpl from "../emails/wishlist-offer-approved"

export type ApproveWishlistOffersInput = {
  approvals: Array<{
    wishlist_id: string
    customer_id: string
    product_id: string
    offer_price: number
    expires_at?: string | null
  }>
  currency_code?: string
}

type ApprovalRecord = ApproveWishlistOffersInput["approvals"][number] & {
  current_price: number | null
  delta: number | null
  campaign_id?: string | null
  promotion_id?: string | null
  promotion_code?: string | null
}

const ts = () => new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14)

async function getCurrentPrice(
  container: any,
  productId: string,
  currencyCode: string
): Promise<number | null> {
  const productModule = container.resolve(Modules.PRODUCT) as any
  const pricingModule = container.resolve(Modules.PRICING) as any
  const query = container.resolve("query") as any

  const [product] = await productModule.listProducts(
    { id: productId },
    { relations: ["variants"] }
  )
  if (!product?.variants?.length) return null

  const variantIds = product.variants.map((v: any) => v.id)
  const { data: variantPriceLinks } = await query.graph({
    entity: "product_variant_price_set",
    filters: { variant_id: variantIds },
    fields: ["variant_id", "price_set_id"],
  })
  if (!variantPriceLinks?.length) return null

  const priceSetIds = variantPriceLinks.map((l: any) => l.price_set_id)
  const allPrices = await pricingModule.listPrices({
    price_set_id: priceSetIds,
    currency_code: currencyCode,
  })

  const amounts = allPrices
    .filter((p: any) => p.currency_code === currencyCode)
    .map((p: any) => Number(p.amount))
  if (!amounts.length) return null
  return Math.min(...amounts)
}

const approveWishlistOffersStep = createStep(
  "approve-wishlist-offers",
  async (input: ApproveWishlistOffersInput, { container }) => {
    const wishlistService = container.resolve(WISHLIST_MODULE) as any
    const promotionModule = container.resolve(Modules.PROMOTION) as any
    const productModule = container.resolve(Modules.PRODUCT) as any
    const currency = (input.currency_code || "aud").toLowerCase()

    const enriched: ApprovalRecord[] = []
    for (const a of input.approvals) {
      const current_price = await getCurrentPrice(container, a.product_id, currency)
      const delta =
        current_price != null ? Math.max(0, current_price - a.offer_price) : null
      enriched.push({ ...a, current_price, delta })
    }

    // Group by customer
    const byCustomer = new Map<string, ApprovalRecord[]>()
    for (const e of enriched) {
      if (!byCustomer.has(e.customer_id)) byCustomer.set(e.customer_id, [])
      byCustomer.get(e.customer_id)!.push(e)
    }

    const wishlistPrev = new Map<string, any>()
    const createdCampaignIds: string[] = []
    const createdPromotionIds: string[] = []

    for (const [customer_id, items] of byCustomer.entries()) {
      const stamp = ts()
      const campaignIdentifier = `BAP_${customer_id.slice(-8)}_${stamp}`
      const [campaign] = await promotionModule.createCampaigns([
        {
          name: `Buy-at-Price for ${customer_id}`,
          campaign_identifier: campaignIdentifier,
          starts_at: new Date(),
        },
      ])
      createdCampaignIds.push(campaign.id)

      for (const item of items) {
        if (item.delta == null || item.delta <= 0) {
          // No discount needed (offer_price >= current_price); still link wishlist with campaign for audit
          const [prev] = await wishlistService.listWishlists({ id: item.wishlist_id })
          wishlistPrev.set(item.wishlist_id, prev)
          await wishlistService.updateWishlists({
            id: item.wishlist_id,
            admin_approved_offer: true,
            admin_offer_price: item.offer_price,
            admin_offer_expires_at: item.expires_at ? new Date(item.expires_at) : null,
            campaign_id: campaign.id,
            promotion_id: null,
            promotion_code: campaignIdentifier,
          })
          item.campaign_id = campaign.id
          item.promotion_code = campaignIdentifier
          continue
        }

        const promotionCode = `BAP_${customer_id.slice(-8)}_${item.product_id.slice(-8)}_${stamp}`
        const [promotion] = await promotionModule.createPromotions([
          {
            code: promotionCode,
            type: "standard",
            status: "active",
            is_automatic: true,
            campaign_id: campaign.id,
            application_method: {
              type: "fixed",
              target_type: "items",
              allocation: "each",
              value: item.delta,
              currency_code: currency,
              max_quantity: 1,
              target_rules: [
                {
                  attribute: "product_id",
                  operator: "eq",
                  values: [item.product_id],
                },
              ],
            },
            rules: [
              {
                attribute: "customer_id",
                operator: "eq",
                values: [customer_id],
              },
            ],
          },
        ])
        createdPromotionIds.push(promotion.id)

        const [prev] = await wishlistService.listWishlists({ id: item.wishlist_id })
        wishlistPrev.set(item.wishlist_id, prev)
        await wishlistService.updateWishlists({
          id: item.wishlist_id,
          admin_approved_offer: true,
          admin_offer_price: item.offer_price,
          admin_offer_expires_at: item.expires_at ? new Date(item.expires_at) : null,
          campaign_id: campaign.id,
          promotion_id: promotion.id,
          promotion_code: promotionCode,
        })
        item.campaign_id = campaign.id
        item.promotion_id = promotion.id
        item.promotion_code = promotionCode
      }
    }

    // Send one email per customer
    try {
      await refreshEmailConfig(container)
    } catch {}
    const customerModule = container.resolve(Modules.CUSTOMER) as any
    for (const [customer_id, items] of byCustomer.entries()) {
      try {
        const [customer] = await customerModule.listCustomers({ id: customer_id })
        if (!customer?.email) continue
        const validItems: any[] = []
        for (const it of items) {
          const [product] = await productModule.listProducts(
            { id: it.product_id },
            { select: ["id", "title", "handle", "metadata"] }
          )
          validItems.push({
            beerName: product?.title || "",
            breweryName: (product as any)?.metadata?.brewery_name || "",
            offerPrice: it.offer_price,
            currencyCode: currency.toUpperCase(),
            handle: product?.handle || "",
          })
        }
        const expires = items.find((i) => i.expires_at)?.expires_at
        const expiresInDays = expires
          ? Math.max(
              0,
              Math.ceil(
                (new Date(expires).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              )
            )
          : null
        await sendTemplate({
          container,
          to: customer.email,
          customerId: customer_id,
          category: "wishlist_offers",
          template: WishlistOfferApprovedTpl,
          props: {
            name: customer.first_name || "there",
            items: validItems,
            expiresInDays,
            storeUrl: getStoreUrl(),
          },
        })
      } catch {}
    }

    // Add promotion codes to each customer's active cart so the discount applies immediately
    const cartModule = container.resolve(Modules.CART) as any
    for (const [customer_id, items] of byCustomer.entries()) {
      try {
        const carts = await cartModule.listCarts(
          { customer_id, completed_at: null },
          { select: ["id"] }
        )
        const codes = items
          .map((it) => it.promotion_code)
          .filter(Boolean) as string[]
        if (!carts.length || !codes.length) continue
        for (const cart of carts) {
          try {
            const { updateCartPromotionsWorkflow } = await import(
              "@medusajs/medusa/core-flows"
            ) as any
            await updateCartPromotionsWorkflow(container).run({
              input: { cart_id: cart.id, promo_codes: codes },
            })
          } catch {}
        }
      } catch {}
    }

    return new StepResponse(
      {
        approved: enriched.length,
        customers: byCustomer.size,
        promotions: createdPromotionIds.length,
        campaigns: createdCampaignIds.length,
        items: enriched,
      },
      {
        wishlistPrev: Array.from(wishlistPrev.values()),
        promotion_ids: createdPromotionIds,
        campaign_ids: createdCampaignIds,
      }
    )
  },
  async (compensation: any, { container }) => {
    if (!compensation) return
    const wishlistService = container.resolve(WISHLIST_MODULE) as any
    const promotionModule = container.resolve(Modules.PROMOTION) as any

    for (const prev of compensation.wishlistPrev || []) {
      try {
        await wishlistService.updateWishlists({
          id: prev.id,
          admin_approved_offer: prev.admin_approved_offer,
          admin_offer_price: prev.admin_offer_price,
          admin_offer_expires_at: prev.admin_offer_expires_at,
          campaign_id: prev.campaign_id,
          promotion_id: prev.promotion_id,
          promotion_code: prev.promotion_code,
        })
      } catch {}
    }
    for (const id of compensation.promotion_ids || []) {
      try {
        await promotionModule.deletePromotions([id])
      } catch {}
    }
    for (const id of compensation.campaign_ids || []) {
      try {
        await promotionModule.deleteCampaigns([id])
      } catch {}
    }
  }
)

const revokeWishlistOfferStep = createStep(
  "revoke-wishlist-offer",
  async (input: { wishlist_id: string }, { container }) => {
    const wishlistService = container.resolve(WISHLIST_MODULE) as any
    const promotionModule = container.resolve(Modules.PROMOTION) as any
    const [prev] = await wishlistService.listWishlists({ id: input.wishlist_id })
    if (!prev) throw new Error("Wishlist item not found")

    if (prev.promotion_id) {
      try {
        await promotionModule.updatePromotions([
          { id: prev.promotion_id, status: "inactive" },
        ])
      } catch {}
    }
    const updated = await wishlistService.updateWishlists({
      id: input.wishlist_id,
      admin_approved_offer: false,
      admin_offer_price: null,
      admin_offer_expires_at: null,
      campaign_id: null,
      promotion_id: null,
      promotion_code: null,
    })
    return new StepResponse(updated, { prev: { ...prev } })
  },
  async (compensation: any, { container }) => {
    if (!compensation?.prev) return
    const wishlistService = container.resolve(WISHLIST_MODULE) as any
    const promotionModule = container.resolve(Modules.PROMOTION) as any
    const { prev } = compensation
    try {
      if (prev.promotion_id) {
        await promotionModule.updatePromotions([
          { id: prev.promotion_id, status: "active" },
        ])
      }
    } catch {}
    await wishlistService.updateWishlists({
      id: prev.id,
      admin_approved_offer: prev.admin_approved_offer,
      admin_offer_price: prev.admin_offer_price,
      admin_offer_expires_at: prev.admin_offer_expires_at,
      campaign_id: prev.campaign_id,
      promotion_id: prev.promotion_id,
      promotion_code: prev.promotion_code,
    })
  }
)

export const approveWishlistOffersWorkflow = createWorkflow(
  "approve-wishlist-offers",
  function (input: ApproveWishlistOffersInput) {
    const result = (approveWishlistOffersStep as any)(input)
    return new WorkflowResponse(result)
  }
)

export const revokeWishlistOfferWorkflow = createWorkflow(
  "revoke-wishlist-offer",
  function (input: { wishlist_id: string }) {
    const result = (revokeWishlistOfferStep as any)(input)
    return new WorkflowResponse(result)
  }
)
