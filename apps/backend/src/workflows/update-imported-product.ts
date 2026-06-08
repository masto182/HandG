import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

type UpdateImportedProductInput = {
  product_id: string
  variant_id: string
  price_aud: number
  product_update: {
    description?: string
    metadata?: Record<string, unknown>
    images?: { url: string }[]
    thumbnail?: string
  }
}

type UpdateImportedProductOutput = {
  product_id: string
  variant_id: string
}

const updateImportedProductStep = createStep(
  "update-imported-product",
  async (input: UpdateImportedProductInput, { container }) => {
    const productModule = container.resolve(Modules.PRODUCT) as any

    // Capture current state for compensation
    const [product] = await productModule.listProducts(
      { id: input.product_id },
      { relations: ["variants", "images"] }
    )
    const variant = product?.variants?.find((v: any) => v.id === input.variant_id)
    const prevPrices = variant?.prices ?? []
    const prevProduct = {
      description: product?.description ?? null,
      metadata: product?.metadata ?? {},
      images: product?.images?.map((i: any) => ({ url: i.url })) ?? [],
      thumbnail: product?.thumbnail ?? null,
    }

    // Apply variant price update
    await productModule.updateProductVariants(input.variant_id, {
      prices: [{ currency_code: "aud", amount: input.price_aud }],
    })

    // Apply product metadata/images update
    await productModule.updateProducts(input.product_id, input.product_update)

    return new StepResponse(
      { product_id: input.product_id, variant_id: input.variant_id },
      { product_id: input.product_id, variant_id: input.variant_id, prevPrices, prevProduct }
    )
  },
  async (
    compensation:
      | {
          product_id: string
          variant_id: string
          prevPrices: any[]
          prevProduct: Record<string, unknown>
        }
      | undefined,
    { container }
  ) => {
    if (!compensation) return
    const productModule = container.resolve(Modules.PRODUCT) as any

    // Restore prices
    if (compensation.prevPrices.length) {
      await productModule.updateProductVariants(compensation.variant_id, {
        prices: compensation.prevPrices.map((p: any) => ({
          currency_code: p.currency_code,
          amount: p.amount,
        })),
      })
    }

    // Restore product fields
    await productModule.updateProducts(compensation.product_id, compensation.prevProduct)
  }
)

export const updateImportedProductWorkflow = createWorkflow(
  "update-imported-product",
  function (input: UpdateImportedProductInput) {
    const result = updateImportedProductStep(input)
    return new WorkflowResponse(result)
  }
)
