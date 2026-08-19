import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BROADCAST_MODULE } from "../../../modules/broadcast"
import { createBroadcastWorkflow } from "../../../workflows/manage-broadcast"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const broadcastService = req.scope.resolve(BROADCAST_MODULE) as any

  const [broadcasts, count] = await broadcastService.listAndCountBroadcasts(
    {},
    { order: { created_at: "DESC" } }
  )

  res.json({ broadcasts, count })
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const actor = (req as any).auth_context?.actor_id ?? null
  const body = req.body as Record<string, unknown>

  const { result } = await createBroadcastWorkflow(req.scope).run({
    input: {
      title: body.title,
      body: body.body,
      link_text: body.link_text ?? null,
      link_url: body.link_url ?? null,
      segment_filter: body.segment_filter ?? {},
      channel_inapp: body.channel_inapp !== false,
      channel_email: body.channel_email !== false,
      create_banner: Boolean(body.create_banner),
      send: Boolean(body.send),
      created_by: actor,
    } as any,
  })

  res.status(201).json({ broadcast: result })
}
