import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { updateAnnouncementWorkflow, deleteAnnouncementWorkflow } from "../../../../workflows/manage-announcement"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const announcementService = req.scope.resolve("announcement") as any
  const { id } = req.params

  const announcement = await announcementService.retrieveAnnouncement(id)

  res.json({ announcement })
}

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params

  const { result } = await updateAnnouncementWorkflow(req.scope).run({
    input: { id, ...(req.body as Record<string, unknown>) },
  })

  res.json({ announcement: result })
}

export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params

  await deleteAnnouncementWorkflow(req.scope).run({
    input: { id },
  })

  res.status(200).json({ id, deleted: true })
}
