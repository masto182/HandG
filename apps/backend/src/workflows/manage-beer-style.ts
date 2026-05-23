import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { BEER_STYLE_MODULE } from "../modules/beer-style"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

type CreateBeerStyleInput = {
  [key: string]: unknown
}

type UpdateBeerStyleInput = {
  id: string
  [key: string]: unknown
}

type DeleteBeerStyleInput = {
  id: string
}

type AssignBeerStyleInput = {
  product_id: string
  beer_style_id: string
}

const createBeerStyleStep = createStep(
  "create-beer-style",
  async (input: CreateBeerStyleInput, { container }) => {
    const beerStyleService = container.resolve(BEER_STYLE_MODULE) as any
    const style = await beerStyleService.createBeerStyles(input)
    return new StepResponse(style, style.id)
  },
  async (id: string | undefined, { container }) => {
    if (!id) return
    const beerStyleService = container.resolve(BEER_STYLE_MODULE) as any
    await beerStyleService.deleteBeerStyles(id)
  }
)

const updateBeerStyleStep = createStep(
  "update-beer-style",
  async (input: UpdateBeerStyleInput, { container }) => {
    const beerStyleService = container.resolve(BEER_STYLE_MODULE) as any
    const prev = await beerStyleService.retrieveBeerStyle(input.id)
    const style = await beerStyleService.updateBeerStyles({ ...input, id: input.id })
    return new StepResponse(style, { id: input.id, prev: { ...prev } })
  },
  async (compensation: any, { container }) => {
    if (!compensation) return
    const beerStyleService = container.resolve(BEER_STYLE_MODULE) as any
    const { id, prev } = compensation
    const { created_at, updated_at, deleted_at, ...restoreData } = prev
    await beerStyleService.updateBeerStyles({ id, ...restoreData })
  }
)

const deleteBeerStyleStep = createStep(
  "delete-beer-style",
  async (input: DeleteBeerStyleInput, { container }) => {
    const beerStyleService = container.resolve(BEER_STYLE_MODULE) as any
    const prev = await beerStyleService.retrieveBeerStyle(input.id)
    await beerStyleService.deleteBeerStyles(input.id)
    return new StepResponse({ deleted: true }, { ...prev })
  },
  async (compensation: any, { container }) => {
    if (!compensation) return
    const beerStyleService = container.resolve(BEER_STYLE_MODULE) as any
    const { id, created_at, updated_at, deleted_at, ...data } = compensation
    await beerStyleService.createBeerStyles({ ...data })
  }
)

const assignBeerStyleStep = createStep(
  "assign-beer-style-link",
  async (input: AssignBeerStyleInput, { container }) => {
    const link = container.resolve(ContainerRegistrationKeys.LINK)
    await link.create({
      beerStyle: { beer_style_id: input.beer_style_id },
      product: { product_id: input.product_id },
    })
    return new StepResponse(
      { linked: true },
      { product_id: input.product_id, beer_style_id: input.beer_style_id }
    )
  },
  async (compensation: any, { container }) => {
    if (!compensation) return
    const link = container.resolve(ContainerRegistrationKeys.LINK)
    await link.dismiss({
      beerStyle: { beer_style_id: compensation.beer_style_id },
      product: { product_id: compensation.product_id },
    })
  }
)

export const createBeerStyleWorkflow = createWorkflow(
  "create-beer-style",
  function (input: CreateBeerStyleInput) {
    const result = (createBeerStyleStep as any)(input)
    return new WorkflowResponse(result)
  }
)

export const updateBeerStyleWorkflow = createWorkflow(
  "update-beer-style",
  function (input: UpdateBeerStyleInput) {
    const result = (updateBeerStyleStep as any)(input)
    return new WorkflowResponse(result)
  }
)

export const deleteBeerStyleWorkflow = createWorkflow(
  "delete-beer-style",
  function (input: DeleteBeerStyleInput) {
    const result = (deleteBeerStyleStep as any)(input)
    return new WorkflowResponse(result)
  }
)

export const assignBeerStyleWorkflow = createWorkflow(
  "assign-beer-style",
  function (input: AssignBeerStyleInput) {
    const result = (assignBeerStyleStep as any)(input)
    return new WorkflowResponse(result)
  }
)
