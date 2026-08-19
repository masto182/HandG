import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BROADCAST_MODULE } from "../../../../modules/broadcast"
import {
  sendBroadcastWorkflow,
  updateBroadcastWorkflow,
} from "../../../../workflows/manage-broadcast"

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
  const body = req.body as Record<string, unknown>

  const broadcast = await broadcastService.retrieveBroadcast(id)
  if (broadcast.status !== "draft") {
    res.status(400).json({ message: `Broadcast is already ${broadcast.status}` })
    return
  }

  if (body.action === "update") {
    const { result } = await updateBroadcastWorkflow(req.scope).run({
      input: {
        id,
        title: body.title,
        body: body.body,
        link_text: body.link_text ?? null,
        link_url: body.link_url ?? null,
        segment_filter: body.segment_filter ?? {},
        channel_inapp: body.channel_inapp !== false,
        channel_email: body.channel_email !== false,
        create_banner: Boolean(body.create_banner),
      } as any,
    })

    res.json({ broadcast: result })
    return
  }

  const { result } = await sendBroadcastWorkflow(req.scope).run({
    input: { id, segment_filter: broadcast.segment_filter ?? {} },
  })

  res.json({ broadcast: result })
}
