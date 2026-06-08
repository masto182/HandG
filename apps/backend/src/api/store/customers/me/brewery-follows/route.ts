import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BREWERY_FOLLOW_MODULE } from "../../../../../modules/brewery-follow"
import {
  upsertBreweryFollowWorkflow,
  deleteBreweryFollowWorkflow,
} from "../../../../../workflows/manage-brewery-follow"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const breweryId = (req.query.brewery_id as string) || undefined
  const breweryFollowService = req.scope.resolve(BREWERY_FOLLOW_MODULE) as any

  const filter: Record<string, unknown> = { customer_id: customerId }
  if (breweryId) {
    filter.brewery_id = breweryId
  }

  const follows = await breweryFollowService.listBreweryFollows(filter)
  res.json({ brewery_follows: follows })
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const { brewery_id, channel_email, channel_inapp } = req.body as {
    brewery_id: string
    channel_email?: boolean
    channel_inapp?: boolean
  }

  if (!brewery_id) {
    return res.status(400).json({ message: "brewery_id is required" })
  }

  const { result } = await upsertBreweryFollowWorkflow(req.scope).run({
    input: { customer_id: customerId, brewery_id, channel_email, channel_inapp },
  })

  const status = (result as any).created ? 201 : 200
  return res.status(status).json({ brewery_follow: (result as any).follow })
}

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const { brewery_id } = req.body as { brewery_id: string }

  if (!brewery_id) {
    return res.status(400).json({ message: "brewery_id is required" })
  }

  await deleteBreweryFollowWorkflow(req.scope).run({
    input: { customer_id: customerId, brewery_id },
  })

  res.status(200).json({ success: true })
}
