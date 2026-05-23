import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { WISHLIST_MODULE } from "../modules/wishlist"

type AddWishlistInput = {
  customer_id: string
  product_id: string
  mode?: string
  target_price?: number | null
  stock_threshold?: number
}

type UpdateWishlistInput = {
  id: string
  mode?: string
  target_price?: number | null
  stock_threshold?: number
  admin_approved_offer?: boolean
  admin_offer_price?: number | null
  admin_offer_expires_at?: string | null
}

type RemoveWishlistInput = {
  id: string
}

const addWishlistItemStep = createStep(
  "add-wishlist-item",
  async (input: AddWishlistInput, { container }) => {
    const wishlistService = container.resolve(WISHLIST_MODULE) as any

    const existing = await wishlistService.listWishlists({
      customer_id: input.customer_id,
      product_id: input.product_id,
    })

    if (existing.length) {
      const prev = { ...existing[0] }
      const updated = await wishlistService.updateWishlists({
        id: existing[0].id,
        mode: input.mode || existing[0].mode || "buy_later",
        target_price: input.target_price ?? existing[0].target_price ?? null,
        stock_threshold: input.stock_threshold ?? existing[0].stock_threshold ?? 2,
      })
      return new StepResponse(updated, { action: "updated", prev })
    }

    const item = await wishlistService.createWishlists({
      customer_id: input.customer_id,
      product_id: input.product_id,
      mode: input.mode || "buy_later",
      target_price: input.target_price ?? null,
      stock_threshold: input.stock_threshold ?? 2,
    })

    return new StepResponse(item, { action: "created", id: item.id })
  },
  async (compensation: any, { container }) => {
    if (!compensation) return
    const wishlistService = container.resolve(WISHLIST_MODULE) as any
    if (compensation.action === "created") {
      await wishlistService.deleteWishlists(compensation.id)
    } else if (compensation.action === "updated" && compensation.prev) {
      await wishlistService.updateWishlists({
        id: compensation.prev.id,
        mode: compensation.prev.mode,
        target_price: compensation.prev.target_price,
        stock_threshold: compensation.prev.stock_threshold,
      })
    }
  }
)

const updateWishlistItemStep = createStep(
  "update-wishlist-item",
  async (input: UpdateWishlistInput, { container }) => {
    const wishlistService = container.resolve(WISHLIST_MODULE) as any
    const [prev] = await wishlistService.listWishlists({ id: input.id })
    if (!prev) throw new Error("Wishlist item not found")

    const { id, ...updates } = input
    const updated = await wishlistService.updateWishlists({ id, ...updates })
    return new StepResponse(updated, { id, prev: { ...prev } })
  },
  async (compensation: any, { container }) => {
    if (!compensation) return
    const wishlistService = container.resolve(WISHLIST_MODULE) as any
    await wishlistService.updateWishlists({
      id: compensation.id,
      mode: compensation.prev.mode,
      target_price: compensation.prev.target_price,
      stock_threshold: compensation.prev.stock_threshold,
      admin_approved_offer: compensation.prev.admin_approved_offer,
      admin_offer_price: compensation.prev.admin_offer_price,
      admin_offer_expires_at: compensation.prev.admin_offer_expires_at,
    })
  }
)

const removeWishlistItemStep = createStep(
  "remove-wishlist-item",
  async (input: RemoveWishlistInput, { container }) => {
    const wishlistService = container.resolve(WISHLIST_MODULE) as any
    const [existing] = await wishlistService.listWishlists({ id: input.id })
    if (!existing) return new StepResponse(null)

    await wishlistService.deleteWishlists(input.id)
    return new StepResponse({ deleted: true }, { ...existing })
  },
  async (compensation: any, { container }) => {
    if (!compensation) return
    const wishlistService = container.resolve(WISHLIST_MODULE) as any
    await wishlistService.createWishlists({
      customer_id: compensation.customer_id,
      product_id: compensation.product_id,
      mode: compensation.mode,
      target_price: compensation.target_price,
      stock_threshold: compensation.stock_threshold,
    })
  }
)

const findAndRemoveWishlistStep = createStep(
  "find-and-remove-wishlist",
  async (input: { customer_id: string; product_id: string }, { container }) => {
    const wishlistService = container.resolve(WISHLIST_MODULE) as any
    const existing = await wishlistService.listWishlists({
      customer_id: input.customer_id,
      product_id: input.product_id,
    })
    if (!existing.length) return new StepResponse(null)

    const item = existing[0]
    await wishlistService.deleteWishlists(item.id)
    return new StepResponse({ deleted: true }, { ...item })
  },
  async (compensation: any, { container }) => {
    if (!compensation) return
    const wishlistService = container.resolve(WISHLIST_MODULE) as any
    await wishlistService.createWishlists({
      customer_id: compensation.customer_id,
      product_id: compensation.product_id,
      mode: compensation.mode,
      target_price: compensation.target_price,
      stock_threshold: compensation.stock_threshold,
    })
  }
)

export const addWishlistWorkflow = createWorkflow(
  "add-wishlist-item",
  function (input: AddWishlistInput) {
    const result = (addWishlistItemStep as any)(input)
    return new WorkflowResponse(result)
  }
)

export const updateWishlistWorkflow = createWorkflow(
  "update-wishlist-item",
  function (input: UpdateWishlistInput) {
    const result = (updateWishlistItemStep as any)(input)
    return new WorkflowResponse(result)
  }
)

export const removeWishlistWorkflow = createWorkflow(
  "remove-wishlist-item",
  function (input: RemoveWishlistInput) {
    const result = (removeWishlistItemStep as any)(input)
    return new WorkflowResponse(result)
  }
)

export const removeWishlistByProductWorkflow = createWorkflow(
  "remove-wishlist-by-product",
  function (input: { customer_id: string; product_id: string }) {
    const result = (findAndRemoveWishlistStep as any)(input)
    return new WorkflowResponse(result)
  }
)
