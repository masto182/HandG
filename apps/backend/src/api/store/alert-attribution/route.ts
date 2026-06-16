import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { ALERT_DISPATCH_MODULE } from "../../../modules/alert-dispatch"

const Schema = z.object({
  dispatch_id: z.string().min(1),
  event: z.enum(["click", "cart"]),
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = Schema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid request" })
  }

  const { dispatch_id, event } = parsed.data
  const dispatchService = req.scope.resolve(ALERT_DISPATCH_MODULE) as any

  const [dispatch] = await dispatchService.listAlertDispatches({ id: dispatch_id })
  if (!dispatch) {
    return res.status(200).json({ recorded: false })
  }

  const now = new Date()
  const update: Record<string, unknown> = { id: dispatch_id }

  if (event === "click") {
    if (!dispatch.clicked_at) update.clicked_at = now
    if (!dispatch.viewed_at) update.viewed_at = now
  } else {
    if (!dispatch.carted_at) update.carted_at = now
  }

  if (Object.keys(update).length > 1) {
    await dispatchService.updateAlertDispatches(update) // workflow-exempt
  }

  res.status(200).json({ recorded: true })
}
