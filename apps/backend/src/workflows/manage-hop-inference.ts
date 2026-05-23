import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { BEER_DETAIL_MODULE } from "../modules/beer-detail"

type ApproveHopInferenceInput = {
  beer_detail_id: string
}

type DismissHopInferenceInput = {
  beer_detail_id: string
}

const approveHopInferenceStep = createStep(
  "approve-hop-inference",
  async (input: ApproveHopInferenceInput, { container }) => {
    const beerDetailService = container.resolve(BEER_DETAIL_MODULE) as any
    const productModule = container.resolve(Modules.PRODUCT) as any

    const detail = await beerDetailService.retrieveBeerDetail(input.beer_detail_id)
    if (!detail) throw new Error("Beer detail not found")

    const [product] = await productModule.listProducts(
      { id: detail.product_id },
      { select: ["id", "metadata"] }
    )
    const previousMetadata = (product as any)?.metadata || {}

    await productModule.updateProducts(detail.product_id, {
      metadata: {
        ...previousMetadata,
        hops: detail.hop_provenance,
        hop_provenance: "inferred",
      },
    })

    const previousStatus = detail.enrichment_status
    await beerDetailService.updateBeerDetails(input.beer_detail_id, {
      enrichment_status: "approved",
    })

    return new StepResponse(
      { success: true },
      {
        beer_detail_id: input.beer_detail_id,
        product_id: detail.product_id,
        previousMetadata,
        previousStatus,
      }
    )
  },
  async (compensation: any, { container }) => {
    if (!compensation) return
    const beerDetailService = container.resolve(BEER_DETAIL_MODULE) as any
    const productModule = container.resolve(Modules.PRODUCT) as any

    await productModule.updateProducts(compensation.product_id, {
      metadata: compensation.previousMetadata,
    })
    await beerDetailService.updateBeerDetails(compensation.beer_detail_id, {
      enrichment_status: compensation.previousStatus,
    })
  }
)

const dismissHopInferenceStep = createStep(
  "dismiss-hop-inference",
  async (input: DismissHopInferenceInput, { container }) => {
    const beerDetailService = container.resolve(BEER_DETAIL_MODULE) as any
    const detail = await beerDetailService.retrieveBeerDetail(input.beer_detail_id)
    const previousStatus = detail?.enrichment_status

    await beerDetailService.updateBeerDetails(input.beer_detail_id, {
      enrichment_status: "dismissed",
    })

    return new StepResponse(
      { success: true },
      { beer_detail_id: input.beer_detail_id, previousStatus }
    )
  },
  async (compensation: any, { container }) => {
    if (!compensation) return
    const beerDetailService = container.resolve(BEER_DETAIL_MODULE) as any
    await beerDetailService.updateBeerDetails(compensation.beer_detail_id, {
      enrichment_status: compensation.previousStatus,
    })
  }
)

export const approveHopInferenceWorkflow = createWorkflow(
  "approve-hop-inference",
  function (input: ApproveHopInferenceInput) {
    const result = (approveHopInferenceStep as any)(input)
    return new WorkflowResponse(result)
  }
)

export const dismissHopInferenceWorkflow = createWorkflow(
  "dismiss-hop-inference",
  function (input: DismissHopInferenceInput) {
    const result = (dismissHopInferenceStep as any)(input)
    return new WorkflowResponse(result)
  }
)
