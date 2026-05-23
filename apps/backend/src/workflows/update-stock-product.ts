import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

type UpdateStockProductInput = {
  product_id: string
  variant_id: string
  description: string
  metadata: Record<string, unknown>
  price: number
}

const updateStockProductStep = createStep(
  "update-stock-product",
  async (input: UpdateStockProductInput, { container }) => {
    const productModule = container.resolve(Modules.PRODUCT) as any

    const [product] = await productModule.listProducts(
      { id: input.product_id },
      { select: ["id", "description", "metadata"], relations: ["variants"] }
    )
    const previousDescription = (product as any)?.description
    const previousMetadata = (product as any)?.metadata || {}

    if (input.variant_id) {
      const variant = (product as any)?.variants?.find((v: any) => v.id === input.variant_id)
      const previousPrices = variant?.prices || []

      await productModule.updateProductVariants(input.variant_id, {
        prices: [{ currency_code: "aud", amount: input.price }],
      })

      await productModule.updateProducts(input.product_id, {
        description: input.description,
        metadata: { ...previousMetadata, ...input.metadata },
      })

      return new StepResponse(
        { updated: true },
        {
          product_id: input.product_id,
          variant_id: input.variant_id,
          previousDescription,
          previousMetadata,
          previousPrices,
        }
      )
    }

    await productModule.updateProducts(input.product_id, {
      description: input.description,
      metadata: { ...previousMetadata, ...input.metadata },
    })

    return new StepResponse(
      { updated: true },
      { product_id: input.product_id, previousDescription, previousMetadata }
    )
  },
  async (compensation: any, { container }) => {
    if (!compensation) return
    const productModule = container.resolve(Modules.PRODUCT) as any

    await productModule.updateProducts(compensation.product_id, {
      description: compensation.previousDescription,
      metadata: compensation.previousMetadata,
    })

    if (compensation.variant_id && compensation.previousPrices) {
      await productModule.updateProductVariants(compensation.variant_id, {
        prices: compensation.previousPrices,
      })
    }
  }
)

export const updateStockProductWorkflow = createWorkflow(
  "update-stock-product",
  function (input: UpdateStockProductInput) {
    const result = (updateStockProductStep as any)(input)
    return new WorkflowResponse(result)
  }
)
