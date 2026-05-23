import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { WISHLIST_MODULE } from "../modules/wishlist"

type ToggleLikeInput = {
  customer_id: string
  product_id: string
}

const toggleProductLikeStep = createStep(
  "toggle-product-like",
  async (input: ToggleLikeInput, { container }) => {
    const wishlistService = container.resolve(WISHLIST_MODULE) as any

    const existing = await wishlistService.listWishlists({
      customer_id: input.customer_id,
      product_id: input.product_id,
      mode: "like",
    })

    if (existing.length) {
      const prev = { ...existing[0] }
      await wishlistService.deleteWishlists(existing[0].id)
      const allLikes = await wishlistService.listWishlists({
        product_id: input.product_id,
        mode: "like",
      })
      return new StepResponse(
        { liked: false, like_count: allLikes.length },
        { action: "deleted", prev }
      )
    }

    await wishlistService.createWishlists({
      customer_id: input.customer_id,
      product_id: input.product_id,
      mode: "like",
    })

    const allLikes = await wishlistService.listWishlists({
      product_id: input.product_id,
      mode: "like",
    })
    return new StepResponse(
      { liked: true, like_count: allLikes.length },
      {
        action: "created",
        customer_id: input.customer_id,
        product_id: input.product_id,
      }
    )
  },
  async (compensation: any, { container }) => {
    if (!compensation) return
    const wishlistService = container.resolve(WISHLIST_MODULE) as any
    if (compensation.action === "created") {
      const existing = await wishlistService.listWishlists({
        customer_id: compensation.customer_id,
        product_id: compensation.product_id,
        mode: "like",
      })
      if (existing.length) {
        await wishlistService.deleteWishlists(existing[0].id)
      }
    } else if (compensation.action === "deleted" && compensation.prev) {
      await wishlistService.createWishlists({
        customer_id: compensation.prev.customer_id,
        product_id: compensation.prev.product_id,
        mode: "like",
      })
    }
  }
)

export const toggleProductLikeWorkflow = createWorkflow(
  "toggle-product-like",
  function (input: ToggleLikeInput) {
    const result = (toggleProductLikeStep as any)(input)
    return new WorkflowResponse(result)
  }
)
