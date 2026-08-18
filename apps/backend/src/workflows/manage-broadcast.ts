import {
  createWorkflow,
  createStep,
  when,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { BROADCAST_MODULE } from "../modules/broadcast"
import { resolveSegment, type BroadcastSegmentFilter } from "../lib/resolve-broadcast-segment"

type CreateBroadcastInput = {
  title: string
  body: string
  link_text?: string | null
  link_url?: string | null
  segment_filter: BroadcastSegmentFilter
  send: boolean
  created_by?: string | null
}

type SendBroadcastInput = {
  id: string
  segment_filter: BroadcastSegmentFilter
}

const createBroadcastStep = createStep(
  "create-broadcast",
  async (input: Omit<CreateBroadcastInput, "send">, { container }) => {
    const broadcastService = container.resolve(BROADCAST_MODULE) as any
    const broadcast = await broadcastService.createBroadcasts({
      title: input.title,
      body: input.body,
      link_text: input.link_text ?? null,
      link_url: input.link_url ?? null,
      segment_filter: input.segment_filter,
      created_by: input.created_by ?? null,
      status: "draft",
    })
    return new StepResponse(broadcast, broadcast.id)
  },
  async (id: string | undefined, { container }) => {
    if (!id) return
    const broadcastService = container.resolve(BROADCAST_MODULE) as any
    await broadcastService.deleteBroadcasts(id)
  }
)

/**
 * Resolves the broadcast's segment_filter and freezes the recipient list by
 * bulk-creating broadcast_recipient rows, then flips the broadcast to
 * "sending". Shared by create-with-send and the later manual-send transition.
 */
const queueRecipientsStep = createStep(
  "queue-broadcast-recipients",
  async (
    input: { broadcast_id: string; segment_filter: BroadcastSegmentFilter },
    { container }
  ) => {
    const broadcastService = container.resolve(BROADCAST_MODULE) as any
    const customerIds = await resolveSegment(container, input.segment_filter)

    if (customerIds.length > 0) {
      await broadcastService.createBroadcastRecipients(
        customerIds.map((customerId) => ({
          broadcast_id: input.broadcast_id,
          customer_id: customerId,
        }))
      )
    }

    const broadcast = await broadcastService.updateBroadcasts({
      id: input.broadcast_id,
      status: "sending",
      recipient_count: customerIds.length,
    })

    return new StepResponse(broadcast, { broadcast_id: input.broadcast_id })
  },
  async (compensation: { broadcast_id: string } | undefined, { container }) => {
    if (!compensation) return
    const broadcastService = container.resolve(BROADCAST_MODULE) as any
    const recipients = await broadcastService.listBroadcastRecipients({
      broadcast_id: compensation.broadcast_id,
    })
    if (recipients.length > 0) {
      await broadcastService.deleteBroadcastRecipients(recipients.map((r: any) => r.id))
    }
    await broadcastService.updateBroadcasts({
      id: compensation.broadcast_id,
      status: "draft",
      recipient_count: 0,
    })
  }
)

export const createBroadcastWorkflow = createWorkflow(
  "create-broadcast",
  function (input: CreateBroadcastInput) {
    const broadcast = createBroadcastStep(input)

    when(input, (i) => i.send).then(function () {
      queueRecipientsStep({
        broadcast_id: broadcast.id,
        segment_filter: input.segment_filter,
      })
    })

    return new WorkflowResponse(broadcast)
  }
)

export const sendBroadcastWorkflow = createWorkflow(
  "send-broadcast",
  function (input: SendBroadcastInput) {
    const result = queueRecipientsStep({
      broadcast_id: input.id,
      segment_filter: input.segment_filter,
    })
    return new WorkflowResponse(result)
  }
)
