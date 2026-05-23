import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { ANNOUNCEMENT_MODULE } from "../modules/announcement"

type CreateAnnouncementInput = {
  [key: string]: unknown
}

type UpdateAnnouncementInput = {
  id: string
  [key: string]: unknown
}

type DeleteAnnouncementInput = {
  id: string
}

const createAnnouncementStep = createStep(
  "create-announcement",
  async (input: CreateAnnouncementInput, { container }) => {
    const announcementService = container.resolve(ANNOUNCEMENT_MODULE) as any
    const announcement = await announcementService.createAnnouncements(input)
    return new StepResponse(announcement, announcement.id)
  },
  async (id: string | undefined, { container }) => {
    if (!id) return
    const announcementService = container.resolve(ANNOUNCEMENT_MODULE) as any
    await announcementService.deleteAnnouncements(id)
  }
)

const updateAnnouncementStep = createStep(
  "update-announcement",
  async (input: UpdateAnnouncementInput, { container }) => {
    const announcementService = container.resolve(ANNOUNCEMENT_MODULE) as any
    const prev = await announcementService.retrieveAnnouncement(input.id)

    const announcement = await announcementService.updateAnnouncements({
      ...input,
      id: input.id,
    })
    return new StepResponse(announcement, { id: input.id, prev: { ...prev } })
  },
  async (compensation: any, { container }) => {
    if (!compensation) return
    const announcementService = container.resolve(ANNOUNCEMENT_MODULE) as any
    const { id, prev } = compensation
    const { created_at, updated_at, deleted_at, ...restoreData } = prev
    await announcementService.updateAnnouncements({ id, ...restoreData })
  }
)

const deleteAnnouncementStep = createStep(
  "delete-announcement",
  async (input: DeleteAnnouncementInput, { container }) => {
    const announcementService = container.resolve(ANNOUNCEMENT_MODULE) as any
    const prev = await announcementService.retrieveAnnouncement(input.id)
    await announcementService.deleteAnnouncements(input.id)
    return new StepResponse({ deleted: true }, { ...prev })
  },
  async (compensation: any, { container }) => {
    if (!compensation) return
    const announcementService = container.resolve(ANNOUNCEMENT_MODULE) as any
    const { id, created_at, updated_at, deleted_at, ...data } = compensation
    await announcementService.createAnnouncements({ ...data })
  }
)

export const createAnnouncementWorkflow = createWorkflow(
  "create-announcement",
  function (input: CreateAnnouncementInput) {
    const result = (createAnnouncementStep as any)(input)
    return new WorkflowResponse(result)
  }
)

export const updateAnnouncementWorkflow = createWorkflow(
  "update-announcement",
  function (input: UpdateAnnouncementInput) {
    const result = (updateAnnouncementStep as any)(input)
    return new WorkflowResponse(result)
  }
)

export const deleteAnnouncementWorkflow = createWorkflow(
  "delete-announcement",
  function (input: DeleteAnnouncementInput) {
    const result = (deleteAnnouncementStep as any)(input)
    return new WorkflowResponse(result)
  }
)
