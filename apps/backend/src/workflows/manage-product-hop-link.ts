import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { HOP_MODULE } from "../modules/hop"

type ProductHopLinkInput = {
  product_id: string
  hop_ids: string[]
}

const linkProductHopsStep = createStep(
  "link-product-hops",
  async (input: ProductHopLinkInput, { container }) => {
    const link = container.resolve(ContainerRegistrationKeys.LINK) as any
    const linked: string[] = []

    for (const hop_id of input.hop_ids) {
      try {
        await link.create({
          [HOP_MODULE]: { hop_id },
          [Modules.PRODUCT]: { product_id: input.product_id },
        })
        linked.push(hop_id)
      } catch (err: any) {
        if (
          !err?.message?.includes("already exists") &&
          !err?.message?.includes("duplicate")
        ) {
          throw err
        }
      }
    }

    return new StepResponse(
      { linked: linked.length },
      { product_id: input.product_id, hop_ids: linked }
    )
  },
  async (compensation: any, { container }) => {
    if (!compensation?.hop_ids?.length) return
    const link = container.resolve(ContainerRegistrationKeys.LINK) as any
    for (const hop_id of compensation.hop_ids) {
      try {
        await link.dismiss({
          [HOP_MODULE]: { hop_id },
          [Modules.PRODUCT]: { product_id: compensation.product_id },
        })
      } catch {}
    }
  }
)

const unlinkProductHopsStep = createStep(
  "unlink-product-hops",
  async (input: ProductHopLinkInput, { container }) => {
    const link = container.resolve(ContainerRegistrationKeys.LINK) as any
    const unlinked: string[] = []

    for (const hop_id of input.hop_ids) {
      try {
        await link.dismiss({
          [HOP_MODULE]: { hop_id },
          [Modules.PRODUCT]: { product_id: input.product_id },
        })
        unlinked.push(hop_id)
      } catch {}
    }

    return new StepResponse(
      { unlinked: unlinked.length },
      { product_id: input.product_id, hop_ids: unlinked }
    )
  },
  async (compensation: any, { container }) => {
    if (!compensation?.hop_ids?.length) return
    const link = container.resolve(ContainerRegistrationKeys.LINK) as any
    for (const hop_id of compensation.hop_ids) {
      try {
        await link.create({
          [HOP_MODULE]: { hop_id },
          [Modules.PRODUCT]: { product_id: compensation.product_id },
        })
      } catch {}
    }
  }
)

export const linkProductHopsWorkflow = createWorkflow(
  "link-product-hops",
  function (input: ProductHopLinkInput) {
    const result = (linkProductHopsStep as any)(input)
    return new WorkflowResponse(result)
  }
)

export const unlinkProductHopsWorkflow = createWorkflow(
  "unlink-product-hops",
  function (input: ProductHopLinkInput) {
    const result = (unlinkProductHopsStep as any)(input)
    return new WorkflowResponse(result)
  }
)
