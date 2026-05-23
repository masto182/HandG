import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { NOTIFICATION_MODULE } from "../modules/notification"

type MarkReadInput = {
  id: string
}

type MarkAllReadInput = {
  customer_id: string
}

const markNotificationReadStep = createStep(
  "mark-notification-read",
  async (input: MarkReadInput, { container }) => {
    const notificationService = container.resolve(NOTIFICATION_MODULE) as any
    await notificationService.updateNotifications({ id: input.id }, { read: true })
    return new StepResponse({ id: input.id }, { id: input.id })
  },
  async (compensation: any, { container }) => {
    if (!compensation) return
    const notificationService = container.resolve(NOTIFICATION_MODULE) as any
    await notificationService.updateNotifications({ id: compensation.id }, { read: false })
  }
)

const markAllNotificationsReadStep = createStep(
  "mark-all-notifications-read",
  async (input: MarkAllReadInput, { container }) => {
    const notificationService = container.resolve(NOTIFICATION_MODULE) as any
    const unread = await notificationService.listNotifications({
      customer_id: input.customer_id,
      read: false,
    })

    const ids = unread.map((n: any) => n.id)
    for (const id of ids) {
      await notificationService.updateNotifications({ id }, { read: true })
    }

    return new StepResponse({ marked: ids.length }, { ids })
  },
  async (compensation: any, { container }) => {
    if (!compensation?.ids?.length) return
    const notificationService = container.resolve(NOTIFICATION_MODULE) as any
    for (const id of compensation.ids) {
      await notificationService.updateNotifications({ id }, { read: false })
    }
  }
)

export const markNotificationReadWorkflow = createWorkflow(
  "mark-notification-read",
  function (input: MarkReadInput) {
    const result = (markNotificationReadStep as any)(input)
    return new WorkflowResponse(result)
  }
)

export const markAllNotificationsReadWorkflow = createWorkflow(
  "mark-all-notifications-read",
  function (input: MarkAllReadInput) {
    const result = (markAllNotificationsReadStep as any)(input)
    return new WorkflowResponse(result)
  }
)
