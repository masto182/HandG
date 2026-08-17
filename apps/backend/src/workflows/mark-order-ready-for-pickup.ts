import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { sendTemplate, refreshEmailConfig, getStoreUrl } from "../lib/email"
import * as OrderReadyForPickupTpl from "../emails/order-ready-for-pickup"

type MarkOrderReadyForPickupInput = {
  order_id: string
  location_name?: string
  location_address?: string
  location_hours?: string
}

const markOrderReadyForPickupStep = createStep(
  "mark-order-ready-for-pickup",
  async (input: MarkOrderReadyForPickupInput, { container }) => {
    const orderModule = container.resolve(Modules.ORDER) as any
    const order = await orderModule.retrieveOrder(input.order_id)

    const prevMetadata = (order.metadata || {}) as Record<string, unknown>
    const snapshot = prevMetadata.pickup_location as any

    const locationName = input.location_name || snapshot?.name || "Hops & Glory pickup point"
    const locationAddress =
      input.location_address ||
      [snapshot?.address_line, snapshot?.suburb, snapshot?.postcode].filter(Boolean).join(", ") ||
      ""
    const locationHours = input.location_hours || snapshot?.hours_summary

    await orderModule.updateOrders(input.order_id, {
      metadata: {
        ...prevMetadata,
        ready_for_pickup_at: new Date().toISOString(),
      },
    })

    return new StepResponse(
      { order, locationName, locationAddress, locationHours },
      {
        order_id: input.order_id,
        prev_ready_for_pickup_at: prevMetadata.ready_for_pickup_at ?? null,
      }
    )
  },
  async (
    compensationData: { order_id: string; prev_ready_for_pickup_at: unknown } | undefined,
    { container }
  ) => {
    if (!compensationData) return
    const orderModule = container.resolve(Modules.ORDER) as any
    const order = await orderModule.retrieveOrder(compensationData.order_id)
    const metadata = { ...(order.metadata || {}) } as Record<string, unknown>
    if (compensationData.prev_ready_for_pickup_at == null) {
      delete metadata.ready_for_pickup_at
    } else {
      metadata.ready_for_pickup_at = compensationData.prev_ready_for_pickup_at
    }
    await orderModule.updateOrders(compensationData.order_id, { metadata })
  }
)

export const markOrderReadyForPickupWorkflow = createWorkflow(
  "mark-order-ready-for-pickup",
  function (input: MarkOrderReadyForPickupInput) {
    const state = markOrderReadyForPickupStep(input)
    return new WorkflowResponse(state)
  }
)

// Helper for the route to call the step result then send the email.
// Email is sent outside the workflow because sendTemplate integrates with
// container-level config that isn't workflow-serializable.
export async function markOrderReadyForPickupAndNotify(
  scope: any,
  input: MarkOrderReadyForPickupInput
) {
  const { result } = await markOrderReadyForPickupWorkflow(scope).run({ input })
  const { order, locationName, locationAddress, locationHours } = result as any

  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["customer.first_name", "shipping_address.first_name", "billing_address.first_name"],
    filters: { id: order.id },
  })
  const firstName =
    (orders[0] as any)?.customer?.first_name ||
    (orders[0] as any)?.shipping_address?.first_name ||
    (orders[0] as any)?.billing_address?.first_name ||
    "Collector"

  await refreshEmailConfig(scope)
  const emailResult = await sendTemplate({
    to: order.email,
    customerId: order.customer_id,
    category: "orders",
    template: OrderReadyForPickupTpl,
    props: {
      name: firstName,
      orderDisplayId: String(order.display_id ?? order.id),
      locationName,
      locationAddress,
      locationHours,
      storeUrl: getStoreUrl(),
    },
    container: scope,
  })

  return { ok: true, email: emailResult }
}
