import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { VIP_SCORE_MODULE } from "../../../modules/vip-score"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const wishlistService = req.scope.resolve("wishlist") as any
  const customerModule = req.scope.resolve(Modules.CUSTOMER) as any
  const productModule = req.scope.resolve(Modules.PRODUCT) as any
  const vipScoreService = req.scope.resolve(VIP_SCORE_MODULE) as any
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

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

  // Preload VIP tiers keyed by customer for fast lookup
  const tierByCustomer = new Map<string, string>()
  try {
    const scores = await vipScoreService.listVipScores({})
    for (const s of scores) {
      tierByCustomer.set((s as any).customer_id, (s as any).current_tier)
    }
  } catch {}

  // Stock for a product = sum of available_quantity across its variants'
  // inventory levels (mirrors api/store/inventory; avoids the list-endpoint
  // inventory_quantity bug by querying product_variant directly).
  const stockForProduct = async (productId: string): Promise<number | null> => {
    try {
      const { data: variants } = await query.graph({
        entity: "product_variant",
        fields: ["id", "inventory_items.inventory.location_levels.available_quantity"],
        filters: { product_id: productId },
      })
      let total = 0
      for (const v of variants as any[]) {
        for (const ii of v.inventory_items || []) {
          for (const ll of ii.inventory?.location_levels || []) {
            total += Number(ll.available_quantity || 0)
          }
        }
      }
      return total
    } catch {
      return null
    }
  }

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
        const { data: productData } = await query.graph({
          entity: "product",
          filters: { id: item.product_id },
          fields: [
            "id",
            "title",
            "variants.id",
            "variants.prices.amount",
            "variants.prices.currency_code",
          ],
        })
        if (productData?.[0]) {
          product_title = (productData[0] as any).title
          const prices: number[] = []
          for (const v of (productData[0] as any).variants || []) {
            for (const pr of (v as any).prices || []) {
              if ((pr as any).currency_code?.toLowerCase() === currency)
                prices.push(Number((pr as any).amount))
            }
          }
          if (prices.length) current_price = Math.min(...prices)
        }
      } catch {}
      const stock = await stockForProduct(item.product_id)
      return {
        id: item.id,
        customer_id: item.customer_id,
        product_id: item.product_id,
        target_price: item.target_price,
        admin_approved_offer: item.admin_approved_offer,
        admin_offer_price: item.admin_offer_price,
        admin_offer_expires_at: item.admin_offer_expires_at,
        customer_email,
        customer_tier: tierByCustomer.get(item.customer_id) || "approved",
        product_title,
        current_price,
        stock,
      }
    })
  )

  res.json({ wishlists: enriched, wishlist_items: enriched })
}
