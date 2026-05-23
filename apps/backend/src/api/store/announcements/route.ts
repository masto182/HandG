import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const announcementService = req.scope.resolve("announcement") as any
  const now = new Date()

  const announcements = await announcementService.listAnnouncements({
    is_active: true,
  })

  const active = announcements.filter((a: any) => {
    if (a.starts_at && new Date(a.starts_at) > now) return false
    if (a.ends_at && new Date(a.ends_at) < now) return false
    return true
  })

  res.json({ announcements: active })
}
