import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { createAnnouncementWorkflow } from "../../../workflows/manage-announcement"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const announcementService = req.scope.resolve("announcement") as any

  const [announcements, count] =
    await announcementService.listAndCountAnnouncements(
      {},
      { order: { created_at: "DESC" } }
    )

  res.json({ announcements, count })
}

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { result } = await createAnnouncementWorkflow(req.scope).run({
    input: req.body as any,
  })

  res.status(201).json({ announcement: result })
}
