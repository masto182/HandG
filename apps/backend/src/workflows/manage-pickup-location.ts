import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { PICKUP_LOCATION_MODULE } from "../modules/pickup-location"

// ── Create ────────────────────────────────────────────────────────────────────

type CreatePickupLocationInput = {
  stock_location_id: string
  slug: string
  [key: string]: unknown
}

const createPickupLocationStep = createStep(
  "create-pickup-location",
  async (input: CreatePickupLocationInput, { container }) => {
    const svc = container.resolve(PICKUP_LOCATION_MODULE) as any
    const created = await svc.createPickupLocations(input)
    const location = Array.isArray(created) ? created[0] : created
    return new StepResponse(location, location.id)
  },
  async (id: string | undefined, { container }) => {
    if (!id) return
    const svc = container.resolve(PICKUP_LOCATION_MODULE) as any
    await svc.deletePickupLocations([id])
  }
)

export const createPickupLocationWorkflow = createWorkflow(
  "create-pickup-location",
  function (input: CreatePickupLocationInput) {
    const location = createPickupLocationStep(input)
    return new WorkflowResponse(location)
  }
)

// ── Update ────────────────────────────────────────────────────────────────────

type UpdatePickupLocationInput = {
  id: string
  data: Record<string, unknown>
}

const updatePickupLocationStep = createStep(
  "update-pickup-location",
  async (input: UpdatePickupLocationInput, { container }) => {
    const svc = container.resolve(PICKUP_LOCATION_MODULE) as any
    const prev = await svc.retrievePickupLocation(input.id)
    await svc.updatePickupLocations({ selector: { id: input.id }, data: input.data })
    const updated = await svc.retrievePickupLocation(input.id)
    return new StepResponse(updated, prev)
  },
  async (prev: Record<string, unknown> | undefined, { container }) => {
    if (!prev?.id) return
    const svc = container.resolve(PICKUP_LOCATION_MODULE) as any
    const { id, ...fields } = prev as any
    await svc.updatePickupLocations({ selector: { id }, data: fields })
  }
)

export const updatePickupLocationWorkflow = createWorkflow(
  "update-pickup-location",
  function (input: UpdatePickupLocationInput) {
    const location = updatePickupLocationStep(input)
    return new WorkflowResponse(location)
  }
)

// ── Delete ────────────────────────────────────────────────────────────────────

type DeletePickupLocationInput = { id: string }

const deletePickupLocationStep = createStep(
  "delete-pickup-location",
  async (input: DeletePickupLocationInput, { container }) => {
    const svc = container.resolve(PICKUP_LOCATION_MODULE) as any
    const prev = await svc.retrievePickupLocation(input.id)
    await svc.deletePickupLocations([input.id])
    return new StepResponse({ id: input.id, deleted: true }, prev)
  },
  async (prev: Record<string, unknown> | undefined, { container }) => {
    if (!prev) return
    const svc = container.resolve(PICKUP_LOCATION_MODULE) as any
    await svc.createPickupLocations(prev)
  }
)

export const deletePickupLocationWorkflow = createWorkflow(
  "delete-pickup-location",
  function (input: DeletePickupLocationInput) {
    const result = deletePickupLocationStep(input)
    return new WorkflowResponse(result)
  }
)
