import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ANALYTICS_MODULE } from "../../../../../modules/analytics"
import {
  buildMemberActivity,
  MEMBER_ACTIVITY_EVENT_TYPES,
} from "../../../../../modules/analytics/lib/insights"

const MEMBER_ACTIVITY_LOOKBACK_DAYS = 90

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const analyticsService = req.scope.resolve(ANALYTICS_MODULE) as any
  const since = new Date(Date.now() - MEMBER_ACTIVITY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
  const events = (await analyticsService.listMemberActivityEvents(req.params.id, {
    since,
    eventTypes: [...MEMBER_ACTIVITY_EVENT_TYPES],
    directLimit: 500,
    sessionLimit: 1000,
  })) as any[]
  const activity = buildMemberActivity(events, req.params.id)

  const lastActiveMap = await analyticsService.getLastActiveByCustomerIds([req.params.id])
  const last_active = lastActiveMap.get(req.params.id) ?? null

  res.json({ activity: { ...activity, last_active } })
}
