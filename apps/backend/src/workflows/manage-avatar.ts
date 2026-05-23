import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

type UploadAvatarInput = {
  customer_id: string
  filename: string
  mimeType: string
  content: Buffer
}

type RemoveAvatarInput = {
  customer_id: string
}

const uploadAvatarFileStep = createStep(
  "upload-avatar-file",
  async (input: UploadAvatarInput, { container }) => {
    const fileModule = container.resolve(Modules.FILE) as any
    const customerModule = container.resolve(Modules.CUSTOMER)

    const uploaded = await fileModule.createFiles([
      {
        filename: input.filename,
        mimeType: input.mimeType,
        content: input.content,
      },
    ])

    const avatarUrl = uploaded[0]?.url
    if (!avatarUrl) throw new Error("Upload failed")

    const [customer] = await customerModule.listCustomers({ id: input.customer_id })
    const existingMetadata = ((customer as any)?.metadata || {}) as Record<string, unknown>
    const previousAvatarUrl = existingMetadata.avatar_url || null

    await customerModule.updateCustomers(input.customer_id, {
      metadata: { ...existingMetadata, avatar_url: avatarUrl },
    })

    return new StepResponse(
      { avatar_url: avatarUrl },
      { customer_id: input.customer_id, previousAvatarUrl, previousMetadata: existingMetadata, file_id: uploaded[0]?.id }
    )
  },
  async (compensation: any, { container }) => {
    if (!compensation) return
    const customerModule = container.resolve(Modules.CUSTOMER)
    await customerModule.updateCustomers(compensation.customer_id, {
      metadata: compensation.previousMetadata,
    })
  }
)

const removeAvatarStep = createStep(
  "remove-avatar",
  async (input: RemoveAvatarInput, { container }) => {
    const customerModule = container.resolve(Modules.CUSTOMER)
    const [customer] = await customerModule.listCustomers({ id: input.customer_id })
    const existingMetadata = ((customer as any)?.metadata || {}) as Record<string, unknown>
    const { avatar_url: _removed, ...rest } = existingMetadata

    await customerModule.updateCustomers(input.customer_id, { metadata: rest })

    return new StepResponse(
      { success: true },
      { customer_id: input.customer_id, previousMetadata: existingMetadata }
    )
  },
  async (compensation: any, { container }) => {
    if (!compensation) return
    const customerModule = container.resolve(Modules.CUSTOMER)
    await customerModule.updateCustomers(compensation.customer_id, {
      metadata: compensation.previousMetadata,
    })
  }
)

export const uploadAvatarWorkflow = createWorkflow(
  "upload-avatar",
  function (input: UploadAvatarInput) {
    const result = (uploadAvatarFileStep as any)(input)
    return new WorkflowResponse(result)
  }
)

export const removeAvatarWorkflow = createWorkflow(
  "remove-avatar",
  function (input: RemoveAvatarInput) {
    const result = (removeAvatarStep as any)(input)
    return new WorkflowResponse(result)
  }
)
