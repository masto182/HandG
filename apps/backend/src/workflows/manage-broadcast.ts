import {
  createWorkflow,
  createStep,
  when,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { BROADCAST_MODULE } from "../modules/broadcast"
import { ANNOUNCEMENT_MODULE } from "../modules/announcement"
import { resolveSegment, type BroadcastSegmentFilter } from "../lib/resolve-broadcast-segment"

type CreateBroadcastInput = {
  title: string
  body: string
  link_text?: string | null
  link_url?: string | null
  segment_filter: BroadcastSegmentFilter
  channel_inapp: boolean
  channel_email: boolean
  create_banner: boolean
  send: boolean
  created_by?: string | null
}

type SendBroadcastInput = {
  id: string
  segment_filter: BroadcastSegmentFilter
}

type UpdateBroadcastInput = {
  id: string
  title: string
  body: string
  link_text?: string | null
  link_url?: string | null
  segment_filter: BroadcastSegmentFilter
  channel_inapp: boolean
  channel_email: boolean
  create_banner: boolean
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
      channel_inapp: input.channel_inapp,
      channel_email: input.channel_email,
      create_banner: input.create_banner,
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
 * Only mutable while the broadcast is still a draft — this is what keeps the
 * banner-creation step (which runs at send time) from ever using stale
 * content: a broadcast can't be edited once it starts sending.
 */
const updateBroadcastStep = createStep(
  "update-broadcast",
  async (input: UpdateBroadcastInput, { container }) => {
    const broadcastService = container.resolve(BROADCAST_MODULE) as any
    const prev = await broadcastService.retrieveBroadcast(input.id)
    if (prev.status !== "draft") {
      throw new Error(`Broadcast ${input.id} is ${prev.status}, not draft — cannot edit`)
    }

    const broadcast = await broadcastService.updateBroadcasts({
      id: input.id,
      title: input.title,
      body: input.body,
      link_text: input.link_text ?? null,
      link_url: input.link_url ?? null,
      segment_filter: input.segment_filter,
      channel_inapp: input.channel_inapp,
      channel_email: input.channel_email,
      create_banner: input.create_banner,
    })
    return new StepResponse(broadcast, { id: input.id, prev })
  },
  async (compensation: { id: string; prev: any } | undefined, { container }) => {
    if (!compensation) return
    const broadcastService = container.resolve(BROADCAST_MODULE) as any
    const { id, created_at, updated_at, deleted_at, ...restoreData } = compensation.prev
    await broadcastService.updateBroadcasts({ id: compensation.id, ...restoreData })
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

/**
 * Idempotent: skips if the broadcast already has a banner_id. A banner is a
 * single global row (not per-recipient), so this only ever runs once per
 * broadcast, at the moment it actually sends.
 */
const createBannerIfRequestedStep = createStep(
  "create-broadcast-banner",
  async (input: { broadcast_id: string }, { container }) => {
    const broadcastService = container.resolve(BROADCAST_MODULE) as any
    const broadcast = await broadcastService.retrieveBroadcast(input.broadcast_id)

    if (!broadcast.create_banner || broadcast.banner_id) {
      return new StepResponse(null, { broadcast_id: input.broadcast_id, banner_id: "" })
    }

    const announcementService = container.resolve(ANNOUNCEMENT_MODULE) as any
    const announcement = await announcementService.createAnnouncements({
      message: broadcast.title,
      link_text: broadcast.link_text,
      link_url: broadcast.link_url,
      type: "info",
      is_active: true,
    })

    await broadcastService.updateBroadcasts({
      id: input.broadcast_id,
      banner_id: announcement.id,
    })

    return new StepResponse(announcement, {
      broadcast_id: input.broadcast_id,
      banner_id: announcement.id as string,
    })
  },
  async (compensation: { broadcast_id: string; banner_id: string } | undefined, { container }) => {
    if (!compensation || !compensation.banner_id) return
    const announcementService = container.resolve(ANNOUNCEMENT_MODULE) as any
    const broadcastService = container.resolve(BROADCAST_MODULE) as any
    await announcementService.deleteAnnouncements(compensation.banner_id)
    await broadcastService.updateBroadcasts({ id: compensation.broadcast_id, banner_id: null })
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
      createBannerIfRequestedStep({ broadcast_id: broadcast.id })
    })

    return new WorkflowResponse(broadcast)
  }
)

export const updateBroadcastWorkflow = createWorkflow(
  "update-broadcast",
  function (input: UpdateBroadcastInput) {
    const result = updateBroadcastStep(input)
    return new WorkflowResponse(result)
  }
)

export const sendBroadcastWorkflow = createWorkflow(
  "send-broadcast",
  function (input: SendBroadcastInput) {
    const result = queueRecipientsStep({
      broadcast_id: input.id,
      segment_filter: input.segment_filter,
    })
    createBannerIfRequestedStep({ broadcast_id: input.id })
    return new WorkflowResponse(result)
  }
)
