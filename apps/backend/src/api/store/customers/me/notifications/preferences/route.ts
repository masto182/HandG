import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
// workflow-exempt: preference updates are lightweight and don't require a workflow
import { NOTIFICATION_PREFERENCE_MODULE } from "../../../../../../modules/notification-preference"
import type NotificationPreferenceModuleService from "../../../../../../modules/notification-preference/service"
import type { NotificationCategory } from "../../../../../../lib/email"
import { VIP_SCORE_MODULE } from "../../../../../../modules/vip-score"
import evaluateVipProgressionWorkflow from "../../../../../../workflows/evaluate-vip-progression"
import { ONBOARDING_STEPS } from "../../../../../../modules/vip-score/onboarding-steps"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  if (!customerId) {
    return res.status(401).json({ error: "unauthenticated" })
  }
  const svc = req.scope.resolve(
    NOTIFICATION_PREFERENCE_MODULE
  ) as NotificationPreferenceModuleService
  const preferences = await svc.listForCustomer(customerId)
  return res.json({ preferences })
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  if (!customerId) {
    return res.status(401).json({ error: "unauthenticated" })
  }
  const body = (req.body || {}) as {
    category?: NotificationCategory
    enabled?: boolean
  }
  if (!body.category || typeof body.enabled !== "boolean") {
    return res.status(400).json({ error: "category and enabled are required" })
  }
  const svc = req.scope.resolve(
    NOTIFICATION_PREFERENCE_MODULE
  ) as NotificationPreferenceModuleService
  const result = await svc.setPreference(customerId, body.category, body.enabled)

  const vipScoreService = req.scope.resolve(VIP_SCORE_MODULE) as any
  const step = ONBOARDING_STEPS.email_prefs
  vipScoreService
    .addOnboardingBonus(customerId, "email_prefs", step.points)
    .then(({ inserted }: { inserted: boolean }) => {
      if (inserted)
        evaluateVipProgressionWorkflow(req.scope)
          .run({ input: { customer_id: customerId } })
          .catch(() => {})
    })
    .catch(() => {})

  return res.json(result)
}
