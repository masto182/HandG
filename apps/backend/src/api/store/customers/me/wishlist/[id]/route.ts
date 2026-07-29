import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  updateWishlistWorkflow,
  removeWishlistWorkflow,
} from "../../../../../../workflows/manage-wishlist"
import { checkPriceAlertImmediate } from "../check-price-alert"
import { VIP_SCORE_MODULE } from "../../../../../../modules/vip-score"
import evaluateVipProgressionWorkflow from "../../../../../../workflows/evaluate-vip-progression"
import { ONBOARDING_STEPS } from "../../../../../../modules/vip-score/onboarding-steps"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const wishlistItemId = req.params.id
  const { mode, target_price, stock_threshold } = req.body as {
    mode?: string
    target_price?: number | null
    stock_threshold?: number
  }
  const wishlistService = req.scope.resolve("wishlist") as any

  const [item] = await wishlistService.listWishlists({ id: wishlistItemId })

  if (!item || item.customer_id !== customerId) {
    return res.status(404).json({ message: "Wishlist item not found" })
  }

  const updates: any = { id: wishlistItemId }
  if (mode) updates.mode = mode
  if (target_price !== undefined) updates.target_price = target_price
  if (stock_threshold !== undefined) updates.stock_threshold = stock_threshold

  const { result } = await updateWishlistWorkflow(req.scope).run({
    input: updates,
  })

  checkPriceAlertImmediate(req.scope, result).catch((err) => {
    console.error("[Wishlist] Immediate price check failed:", err)
  })

  if (target_price !== undefined && target_price !== null && !item.target_price) {
    const vipScoreService = req.scope.resolve(VIP_SCORE_MODULE) as any
    const step = ONBOARDING_STEPS.price_alert
    vipScoreService
      .addOnboardingBonus(customerId, "price_alert", step.points)
      .then(({ inserted }: { inserted: boolean }) => {
        if (inserted)
          evaluateVipProgressionWorkflow(req.scope)
            .run({ input: { customer_id: customerId } })
            .catch(() => {})
      })
      .catch(() => {})
  }
  if (stock_threshold !== undefined && !item.stock_threshold) {
    const vipScoreService = req.scope.resolve(VIP_SCORE_MODULE) as any
    const step = ONBOARDING_STEPS.stock_alert
    vipScoreService
      .addOnboardingBonus(customerId, "stock_alert", step.points)
      .then(({ inserted }: { inserted: boolean }) => {
        if (inserted)
          evaluateVipProgressionWorkflow(req.scope)
            .run({ input: { customer_id: customerId } })
            .catch(() => {})
      })
      .catch(() => {})
  }

  res.json({ wishlist_item: result })
}

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const wishlistItemId = req.params.id
  const wishlistService = req.scope.resolve("wishlist") as any

  const [item] = await wishlistService.listWishlists({ id: wishlistItemId })

  if (!item || item.customer_id !== customerId) {
    return res.status(404).json({ message: "Wishlist item not found" })
  }

  await removeWishlistWorkflow(req.scope).run({
    input: { id: wishlistItemId },
  })

  res.json({ success: true })
}
