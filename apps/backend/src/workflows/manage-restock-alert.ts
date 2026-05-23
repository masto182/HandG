import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { RESTOCK_ALERT_MODULE } from "../modules/restock-alert"

type CreateRestockAlertInput = {
  customer_id: string
  product_id: string
  variant_id: string
  threshold: number
  vip_tier?: string
}

type DeleteRestockAlertInput = {
  id: string
  customer_id: string
}

const createRestockAlertStep = createStep(
  "create-restock-alert",
  async (input: CreateRestockAlertInput, { container }) => {
    const restockAlertService = container.resolve(RESTOCK_ALERT_MODULE) as any

    const existing = await restockAlertService.listRestockAlerts({
      customer_id: input.customer_id,
      variant_id: input.variant_id,
    })

    if (existing.length) {
      return new StepResponse(existing[0], { action: "existing" })
    }

    const alert = await restockAlertService.createRestockAlerts({
      customer_id: input.customer_id,
      product_id: input.product_id,
      variant_id: input.variant_id,
      threshold: input.threshold,
      vip_tier: input.vip_tier || "approved",
    })

    return new StepResponse(alert, { action: "created", id: alert.id })
  },
  async (compensation: any, { container }) => {
    if (!compensation || compensation.action !== "created") return
    const restockAlertService = container.resolve(RESTOCK_ALERT_MODULE) as any
    await restockAlertService.deleteRestockAlerts(compensation.id)
  }
)

const deleteRestockAlertStep = createStep(
  "delete-restock-alert",
  async (input: DeleteRestockAlertInput, { container }) => {
    const restockAlertService = container.resolve(RESTOCK_ALERT_MODULE) as any
    const [alert] = await restockAlertService.listRestockAlerts({
      id: input.id,
      customer_id: input.customer_id,
    })

    if (!alert) throw new Error("Restock alert not found")

    await restockAlertService.deleteRestockAlerts(input.id)
    return new StepResponse({ deleted: true }, { ...alert })
  },
  async (compensation: any, { container }) => {
    if (!compensation) return
    const restockAlertService = container.resolve(RESTOCK_ALERT_MODULE) as any
    await restockAlertService.createRestockAlerts({
      customer_id: compensation.customer_id,
      product_id: compensation.product_id,
      variant_id: compensation.variant_id,
      threshold: compensation.threshold,
      vip_tier: compensation.vip_tier,
    })
  }
)

export const createRestockAlertWorkflow = createWorkflow(
  "create-restock-alert",
  function (input: CreateRestockAlertInput) {
    const result = (createRestockAlertStep as any)(input)
    return new WorkflowResponse(result)
  }
)

export const deleteRestockAlertWorkflow = createWorkflow(
  "delete-restock-alert",
  function (input: DeleteRestockAlertInput) {
    const result = (deleteRestockAlertStep as any)(input)
    return new WorkflowResponse(result)
  }
)
