import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BROADCAST_MODULE } from "../../../../modules/broadcast"
import { sendBroadcastWorkflow } from "../../../../workflows/manage-broadcast"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const broadcastService = req.scope.resolve(BROADCAST_MODULE) as any
  const { id } = req.params

  const broadcast = await broadcastService.retrieveBroadcast(id)
  const [, recipientCount] = await broadcastService.listAndCountBroadcastRecipients({
    broadcast_id: id,
  })

  res.json({ broadcast, recipient_count: recipientCount })
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const broadcastService = req.scope.resolve(BROADCAST_MODULE) as any
  const { id } = req.params

  const broadcast = await broadcastService.retrieveBroadcast(id)
  if (broadcast.status !== "draft") {
    res.status(400).json({ message: `Broadcast is already ${broadcast.status}` })
    return
  }

  const { result } = await sendBroadcastWorkflow(req.scope).run({
    input: { id, segment_filter: broadcast.segment_filter ?? {} },
  })

  res.json({ broadcast: result })
}
