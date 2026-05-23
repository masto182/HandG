import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { BREWERY_MODULE } from "../modules/brewery"

type CreateBreweryInput = {
  name: string
  slug: string
  description?: string
  location?: string
  logo_url?: string
  hero_image_url?: string
  website_url?: string
  untappd_url?: string
  facebook_url?: string
  instagram_url?: string
}

type UpdateBreweryInput = {
  id: string
  [key: string]: unknown
}

type DeleteBreweryInput = {
  id: string
}

const createBreweryStep = createStep(
  "create-brewery",
  async (input: CreateBreweryInput, { container }) => {
    const breweryService = container.resolve(BREWERY_MODULE) as any
    const brewery = await breweryService.createBreweries(input)
    return new StepResponse(brewery, brewery.id)
  },
  async (id: string | undefined, { container }) => {
    if (!id) return
    const breweryService = container.resolve(BREWERY_MODULE) as any
    await breweryService.deleteBreweries(id)
  }
)

const updateBreweryStep = createStep(
  "update-brewery",
  async (input: UpdateBreweryInput, { container }) => {
    const breweryService = container.resolve(BREWERY_MODULE) as any
    const prev = await breweryService.retrieveBrewery(input.id)

    const { id, ...updates } = input
    let brewery
    try {
      brewery = await breweryService.updateBreweries(id, updates)
    } catch {
      try {
        brewery = await breweryService.updateBreweries({ id, ...updates })
      } catch {
        const [result] = await breweryService.updateBreweries([{ id, ...updates }])
        brewery = result
      }
    }

    return new StepResponse(brewery, { id, prev: { ...prev } })
  },
  async (compensation: any, { container }) => {
    if (!compensation) return
    const breweryService = container.resolve(BREWERY_MODULE) as any
    const { id, prev } = compensation
    const { created_at, updated_at, deleted_at, ...restoreData } = prev
    try {
      await breweryService.updateBreweries(id, restoreData)
    } catch {
      try {
        await breweryService.updateBreweries({ id, ...restoreData })
      } catch {
        await breweryService.updateBreweries([{ id, ...restoreData }])
      }
    }
  }
)

const deleteBreweryStep = createStep(
  "delete-brewery",
  async (input: DeleteBreweryInput, { container }) => {
    const breweryService = container.resolve(BREWERY_MODULE) as any
    const prev = await breweryService.retrieveBrewery(input.id)
    await breweryService.deleteBreweries(input.id)
    return new StepResponse({ deleted: true }, { ...prev })
  },
  async (compensation: any, { container }) => {
    if (!compensation) return
    const breweryService = container.resolve(BREWERY_MODULE) as any
    const { id, created_at, updated_at, deleted_at, ...data } = compensation
    await breweryService.createBreweries({ ...data })
  }
)

export const createBreweryWorkflow = createWorkflow(
  "create-brewery",
  function (input: CreateBreweryInput) {
    const result = (createBreweryStep as any)(input)
    return new WorkflowResponse(result)
  }
)

export const updateBreweryWorkflow = createWorkflow(
  "update-brewery",
  function (input: UpdateBreweryInput) {
    const result = (updateBreweryStep as any)(input)
    return new WorkflowResponse(result)
  }
)

export const deleteBreweryWorkflow = createWorkflow(
  "delete-brewery",
  function (input: DeleteBreweryInput) {
    const result = (deleteBreweryStep as any)(input)
    return new WorkflowResponse(result)
  }
)
