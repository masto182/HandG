import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { NOTIFICATION_PREFERENCE_MODULE } from "../../../../../../modules/notification-preference"
import { isKnownCategory } from "../../../../../../modules/notification-preference/categories"
import type NotificationPreferenceModuleService from "../../../../../../modules/notification-preference/service"
import type { NotificationCategory } from "../../../../../../lib/email"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const customerId = req.params.id
  const svc = req.scope.resolve(
    NOTIFICATION_PREFERENCE_MODULE
  ) as NotificationPreferenceModuleService
  const preferences = await svc.listForCustomer(customerId)
  return res.json({ preferences })
}

/**
 * Admin override — bypasses the transactional-disable guard so support staff
 * can adjust at customer request. Audit trail is the request log.
 */
export async function PATCH(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const customerId = req.params.id
  const body = (req.body || {}) as {
    category?: NotificationCategory
    enabled?: boolean
  }
  if (!body.category || typeof body.enabled !== "boolean") {
    return res
      .status(400)
      .json({ error: "category and enabled are required" })
  }
  if (!isKnownCategory(body.category)) {
    return res
      .status(400)
      .json({ error: `unknown category: ${body.category}` })
  }

  const svc = req.scope.resolve(
    NOTIFICATION_PREFERENCE_MODULE
  ) as NotificationPreferenceModuleService

  // Admin bypass: write directly via list+update/create rather than
  // setPreference (which guards transactional disable).
  const existing = (await (svc as any).listNotificationPreferences({
    customer_id: customerId,
    category: body.category,
  })) as Array<{ id: string }>
  if (existing.length > 0) {
    await (svc as any).updateNotificationPreferences({
      selector: { id: existing[0].id },
      data: { enabled: body.enabled },
    })
  } else {
    await (svc as any).createNotificationPreferences({
      customer_id: customerId,
      category: body.category,
      enabled: body.enabled,
    })
  }

  const preferences = await svc.listForCustomer(customerId)
  return res.json({ updated: true, preferences })
}
