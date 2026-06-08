import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { BREWERY_FOLLOW_MODULE } from "../modules/brewery-follow"

type UpsertBreweryFollowInput = {
  customer_id: string
  brewery_id: string
  channel_email?: boolean
  channel_inapp?: boolean
}

const upsertBreweryFollowStep = createStep(
  "upsert-brewery-follow",
  async (input: UpsertBreweryFollowInput, { container }) => {
    const svc = container.resolve(BREWERY_FOLLOW_MODULE) as any
    const channels: Record<string, boolean> = {}
    if (typeof input.channel_email === "boolean") channels.channel_email = input.channel_email
    if (typeof input.channel_inapp === "boolean") channels.channel_inapp = input.channel_inapp

    const existing = await svc.listBreweryFollows({
      customer_id: input.customer_id,
      brewery_id: input.brewery_id,
    })

    if (existing.length) {
      const prev = existing[0]
      let follow = prev
      if (Object.keys(channels).length) {
        const updated = await svc.updateBreweryFollows({ id: prev.id, ...channels })
        follow = Array.isArray(updated) ? updated[0] : updated
      }
      return new StepResponse(
        { follow, created: false },
        { action: "update" as const, id: prev.id, original: prev }
      )
    }

    const created = await svc.createBreweryFollows({
      customer_id: input.customer_id,
      brewery_id: input.brewery_id,
      ...channels,
    })
    const follow = Array.isArray(created) ? created[0] : created
    return new StepResponse(
      { follow, created: true },
      { action: "create" as const, id: follow.id, original: null }
    )
  },
  async (
    compensationData: { action: "create" | "update"; id: string; original: any } | undefined,
    { container }
  ) => {
    if (!compensationData) return
    const svc = container.resolve(BREWERY_FOLLOW_MODULE) as any
    if (compensationData.action === "create") {
      await svc.deleteBreweryFollows(compensationData.id)
    } else if (compensationData.action === "update" && compensationData.original) {
      await svc.updateBreweryFollows({
        id: compensationData.id,
        channel_email: compensationData.original.channel_email,
        channel_inapp: compensationData.original.channel_inapp,
      })
    }
  }
)

export const upsertBreweryFollowWorkflow = createWorkflow(
  "upsert-brewery-follow",
  function (input: UpsertBreweryFollowInput) {
    const result = upsertBreweryFollowStep(input)
    return new WorkflowResponse(result)
  }
)

// ── Delete ─────────────────────────────────────────────────────────────────

type DeleteBreweryFollowInput = {
  customer_id: string
  brewery_id: string
}

const deleteBreweryFollowStep = createStep(
  "delete-brewery-follow",
  async (input: DeleteBreweryFollowInput, { container }) => {
    const svc = container.resolve(BREWERY_FOLLOW_MODULE) as any
    const existing = await svc.listBreweryFollows({
      customer_id: input.customer_id,
      brewery_id: input.brewery_id,
    })
    if (!existing.length) {
      return new StepResponse({ success: true }, null)
    }
    const prev = existing[0]
    await svc.deleteBreweryFollows(prev.id)
    return new StepResponse({ success: true }, prev)
  },
  async (prev: any | null, { container }) => {
    if (!prev) return
    const svc = container.resolve(BREWERY_FOLLOW_MODULE) as any
    await svc.createBreweryFollows(prev)
  }
)

export const deleteBreweryFollowWorkflow = createWorkflow(
  "delete-brewery-follow",
  function (input: DeleteBreweryFollowInput) {
    const result = deleteBreweryFollowStep(input)
    return new WorkflowResponse(result)
  }
)
