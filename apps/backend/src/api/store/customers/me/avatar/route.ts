import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { uploadAvatarWorkflow, removeAvatarWorkflow } from "../../../../../workflows/manage-avatar"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id

  const files = (req as any).files
  if (!files || !files.length) {
    return res.status(400).json({ message: "No file uploaded" })
  }

  const { result } = await uploadAvatarWorkflow(req.scope).run({
    input: {
      customer_id: customerId,
      filename: files[0].originalname,
      mimeType: files[0].mimetype,
      content: files[0].buffer,
    },
  })

  res.json(result)
}

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id

  await removeAvatarWorkflow(req.scope).run({
    input: { customer_id: customerId },
  })

  res.json({ success: true })
}
