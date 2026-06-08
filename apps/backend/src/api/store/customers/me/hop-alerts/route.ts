import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { HOP_ALERT_MODULE } from "../../../../../modules/hop-alert"
import {
  upsertHopAlertWorkflow,
  deleteHopAlertWorkflow,
} from "../../../../../workflows/manage-hop-alert"

const UpsertSchema = z.object({
  hop_id: z.string().min(1),
  channel_email: z.boolean().optional(),
  channel_inapp: z.boolean().optional(),
})

const DeleteSchema = z.object({
  hop_id: z.string().min(1),
})

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const hopId = (req.query.hop_id as string) || undefined
  const hopAlertService = req.scope.resolve(HOP_ALERT_MODULE) as any

  const filter: Record<string, unknown> = { customer_id: customerId }
  if (hopId) {
    filter.hop_id = hopId
  }

  const hop_alerts = await hopAlertService.listHopAlerts(filter)
  res.json({ hop_alerts })
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const parsed = UpsertSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid request" })
  }

  const { result } = await upsertHopAlertWorkflow(req.scope).run({
    input: { customer_id: customerId, ...parsed.data },
  })

  res.status(result.created ? 201 : 200).json({ hop_alert: result.alert })
}

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const parsed = DeleteSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid request" })
  }

  await deleteHopAlertWorkflow(req.scope).run({
    input: { customer_id: customerId, hop_id: parsed.data.hop_id },
  })

  res.status(200).json({ success: true })
}
