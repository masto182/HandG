import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { HOP_MODULE } from "../modules/hop"

type CreateHopInput = {
  name: string
  slug: string
  origin?: string | null
  flavor_profile?: string | null
  description?: string | null
  image_url?: string | null
}

type UpdateHopInput = {
  id: string
  name?: string
  slug?: string
  origin?: string | null
  flavor_profile?: string | null
  description?: string | null
  image_url?: string | null
  is_active?: boolean
}

const createHopStep = createStep(
  "create-hop",
  async (input: CreateHopInput, { container }) => {
    const hopService = container.resolve(HOP_MODULE) as any
    const hop = await hopService.createHops({
      name: input.name,
      slug: input.slug,
      origin: input.origin ?? null,
      flavor_profile: input.flavor_profile ?? null,
      description: input.description ?? null,
      image_url: input.image_url ?? null,
      is_active: true,
    })
    return new StepResponse(hop, { id: hop.id })
  },
  async (compensation: any, { container }) => {
    if (!compensation) return
    const hopService = container.resolve(HOP_MODULE) as any
    await hopService.deleteHops(compensation.id)
  }
)

const updateHopStep = createStep(
  "update-hop",
  async (input: UpdateHopInput, { container }) => {
    const hopService = container.resolve(HOP_MODULE) as any
    const prev = await hopService.retrieveHop(input.id)
    if (!prev) throw new Error("Hop not found")

    const { id, ...updates } = input
    const hop = await hopService.updateHops(id, updates)
    return new StepResponse(hop, { id, prev: { ...prev } })
  },
  async (compensation: any, { container }) => {
    if (!compensation) return
    const hopService = container.resolve(HOP_MODULE) as any
    const { id, prev } = compensation
    await hopService.updateHops(id, {
      name: prev.name,
      slug: prev.slug,
      origin: prev.origin,
      flavor_profile: prev.flavor_profile,
      description: prev.description,
      image_url: prev.image_url,
      is_active: prev.is_active,
    })
  }
)

export const createHopWorkflow = createWorkflow(
  "create-hop",
  function (input: CreateHopInput) {
    const result = (createHopStep as any)(input)
    return new WorkflowResponse(result)
  }
)

export const updateHopWorkflow = createWorkflow(
  "update-hop",
  function (input: UpdateHopInput) {
    const result = (updateHopStep as any)(input)
    return new WorkflowResponse(result)
  }
)
