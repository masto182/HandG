import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

type RecordAuspostTrackingInput = {
  order_id: string
  fulfillment_id: string
  tracking_numbers: string[]
  carrier_url?: string
}

const recordAuspostTrackingStep = createStep(
  "record-auspost-tracking",
  async (input: RecordAuspostTrackingInput, { container }) => {
    const fulfillmentModule = container.resolve(Modules.FULFILLMENT) as any
    const fulfillment = await fulfillmentModule.retrieveFulfillment(input.fulfillment_id)

    const existingData = (fulfillment?.data ?? {}) as Record<string, unknown>
    const prevTrackingNumbers = (existingData.tracking_numbers ?? []) as string[]

    const trackingUrl = (n: string) =>
      input.carrier_url
        ? `${input.carrier_url}${encodeURIComponent(n)}`
        : `https://auspost.com.au/mypost/track/details/${encodeURIComponent(n)}`

    const labels = input.tracking_numbers.map((n) => ({
      tracking_number: n,
      tracking_url: trackingUrl(n),
      label_url: "",
    }))

    await fulfillmentModule.updateFulfillment(input.fulfillment_id, {
      data: {
        ...existingData,
        tracking_numbers: input.tracking_numbers,
        lodged_at: new Date().toISOString(),
      },
      labels,
      shipped_at: new Date(),
    })

    return new StepResponse(
      {
        fulfillment_id: input.fulfillment_id,
        tracking_numbers: input.tracking_numbers,
        labels,
      },
      {
        fulfillment_id: input.fulfillment_id,
        prev_data: existingData,
        prev_tracking_numbers: prevTrackingNumbers,
      }
    )
  },
  async (
    prev:
      | {
          fulfillment_id: string
          prev_data: Record<string, unknown>
          prev_tracking_numbers: string[]
        }
      | undefined,
    { container }
  ) => {
    if (!prev) return
    const fulfillmentModule = container.resolve(Modules.FULFILLMENT) as any
    await fulfillmentModule.updateFulfillment(prev.fulfillment_id, {
      data: prev.prev_data,
      labels: [],
      shipped_at: null,
    })
  }
)

export const recordAuspostTrackingWorkflow = createWorkflow(
  "record-auspost-tracking",
  function (input: RecordAuspostTrackingInput) {
    const result = recordAuspostTrackingStep(input)
    return new WorkflowResponse(result)
  }
)
