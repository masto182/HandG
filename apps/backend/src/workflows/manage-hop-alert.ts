import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { HOP_ALERT_MODULE } from "../modules/hop-alert"

type UpsertHopAlertInput = {
  customer_id: string
  hop_id: string
  channel_email?: boolean
  channel_inapp?: boolean
}

type DeleteHopAlertInput = {
  customer_id: string
  hop_id: string
}

type UpsertCompensation =
  | { action: "create"; id: string }
  | {
      action: "update"
      id: string
      prev: { channel_email: boolean; channel_inapp: boolean }
    }
  | null

const upsertHopAlertStep = createStep(
  "upsert-hop-alert",
  async (input: UpsertHopAlertInput, { container }) => {
    const hopAlertService = container.resolve(HOP_ALERT_MODULE) as any

    // Medusa 2.17 / MikroORM 6.6: auto-generated listXxx in workflow-step context
    // may return a minimal default field selection (only id). Specify select
    // explicitly so hop_id, customer_id etc. are available for the dedup check.
    const customerAlerts = await hopAlertService.listHopAlerts(
      { customer_id: input.customer_id, hop_id: input.hop_id },
      { select: ["id", "customer_id", "hop_id", "channel_email", "channel_inapp"] }
    )
    const existing = customerAlerts[0] ?? null

    if (existing) {
      const prev = {
        channel_email: existing.channel_email,
        channel_inapp: existing.channel_inapp,
      }
      const next: Record<string, unknown> = { id: existing.id }
      if (typeof input.channel_email === "boolean") {
        next.channel_email = input.channel_email
      }
      if (typeof input.channel_inapp === "boolean") {
        next.channel_inapp = input.channel_inapp
      }

      let alert = existing
      if (Object.keys(next).length > 1) {
        const updated = await hopAlertService.updateHopAlerts(next)
        alert = Array.isArray(updated) ? updated[0] : updated
      }

      return new StepResponse({ alert, created: false }, {
        action: "update",
        id: existing.id,
        prev,
      } as UpsertCompensation)
    }

    const created = await hopAlertService.createHopAlerts({
      customer_id: input.customer_id,
      hop_id: input.hop_id,
      channel_email: typeof input.channel_email === "boolean" ? input.channel_email : true,
      channel_inapp: typeof input.channel_inapp === "boolean" ? input.channel_inapp : true,
    })
    const alert = Array.isArray(created) ? created[0] : created

    return new StepResponse({ alert, created: true }, {
      action: "create",
      id: alert.id,
    } as UpsertCompensation)
  },
  // TS 6: stricter generic variance on CompensateFn — cast to satisfy the type
  async (compensation: UpsertCompensation | any, { container }) => {
    if (!compensation) return
    const hopAlertService = container.resolve(HOP_ALERT_MODULE) as any
    if (compensation.action === "create") {
      await hopAlertService.deleteHopAlerts(compensation.id)
    } else {
      await hopAlertService.updateHopAlerts({
        id: compensation.id,
        channel_email: compensation.prev.channel_email,
        channel_inapp: compensation.prev.channel_inapp,
      })
    }
  }
)

const deleteHopAlertStep = createStep(
  "delete-hop-alert",
  async (input: DeleteHopAlertInput, { container }) => {
    const hopAlertService = container.resolve(HOP_ALERT_MODULE) as any

    const [alert] = await hopAlertService.listHopAlerts({
      customer_id: input.customer_id,
      hop_id: input.hop_id,
    })
    if (!alert) {
      return new StepResponse({ deleted: false, hop_id: input.hop_id }, null)
    }

    await hopAlertService.deleteHopAlerts(alert.id)
    return new StepResponse({ deleted: true, hop_id: input.hop_id }, alert)
  },
  async (alert: any, { container }) => {
    if (!alert) return
    const hopAlertService = container.resolve(HOP_ALERT_MODULE) as any
    await hopAlertService.createHopAlerts({
      customer_id: alert.customer_id,
      hop_id: alert.hop_id,
      channel_email: alert.channel_email,
      channel_inapp: alert.channel_inapp,
    })
  }
)

export const upsertHopAlertWorkflow = createWorkflow(
  "upsert-hop-alert",
  function (input: UpsertHopAlertInput) {
    const result = (upsertHopAlertStep as any)(input)
    return new WorkflowResponse(result)
  }
)

export const deleteHopAlertWorkflow = createWorkflow(
  "delete-hop-alert",
  function (input: DeleteHopAlertInput) {
    const result = (deleteHopAlertStep as any)(input)
    return new WorkflowResponse(result)
  }
)
