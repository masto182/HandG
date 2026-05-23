import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { NOTIFICATION_PREFERENCE_MODULE } from "../../../../../../modules/notification-preference"
import type NotificationPreferenceModuleService from "../../../../../../modules/notification-preference/service"
import type { NotificationCategory } from "../../../../../../lib/email"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
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

export async function PATCH(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const customerId = req.auth_context.actor_id
  if (!customerId) {
    return res.status(401).json({ error: "unauthenticated" })
  }
  const body = (req.body || {}) as {
    category?: NotificationCategory
    enabled?: boolean
  }
  if (!body.category || typeof body.enabled !== "boolean") {
    return res
      .status(400)
      .json({ error: "category and enabled are required" })
  }
  const svc = req.scope.resolve(
    NOTIFICATION_PREFERENCE_MODULE
  ) as NotificationPreferenceModuleService
  const result = await svc.setPreference(
    customerId,
    body.category,
    body.enabled
  )
  return res.json(result)
}
