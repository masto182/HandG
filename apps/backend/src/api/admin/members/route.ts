import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { VIP_SCORE_MODULE } from "../../../modules/vip-score"
import { REFERRAL_MODULE } from "../../../modules/referral"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerModule = req.scope.resolve(Modules.CUSTOMER) as any
  const vipScoreService = req.scope.resolve(VIP_SCORE_MODULE) as any
  const referralService = req.scope.resolve(REFERRAL_MODULE) as any

  const { group, q, limit: rawLimit, offset: rawOffset } = req.query as {
    group?: string
    q?: string
    limit?: string
    offset?: string
  }
  const limit = Math.min(parseInt(rawLimit || "50", 10) || 50, 200)
  const offset = parseInt(rawOffset || "0", 10) || 0

  const customers = await customerModule.listCustomers({}, { relations: ["groups"] })

  let filtered = customers
  if (group && group !== "all") {
    filtered = filtered.filter((c: any) =>
      c.groups?.some((g: any) => g.name === group)
    )
  }
  if (q) {
    const needle = q.toLowerCase()
    filtered = filtered.filter(
      (c: any) =>
        (c.email || "").toLowerCase().includes(needle) ||
        (c.first_name || "").toLowerCase().includes(needle) ||
        (c.last_name || "").toLowerCase().includes(needle)
    )
  }

  const total = filtered.length
  const page = filtered.slice(offset, offset + limit)

  const allScores = await vipScoreService.listVipScores({})
  const allReferrals = await referralService.listReferrals({})

  const scoreMap = new Map(allScores.map((s: any) => [s.customer_id, s]))
  const referralCountMap = new Map<string, number>()
  for (const r of allReferrals) {
    const count = referralCountMap.get(r.referrer_customer_id) || 0
    referralCountMap.set(r.referrer_customer_id, count + 1)
  }

  const members = page.map((c: any) => {
    const score = scoreMap.get(c.id) as any
    return {
      id: c.id,
      email: c.email,
      first_name: c.first_name,
      last_name: c.last_name,
      groups: c.groups?.map((g: any) => g.name) || [],
      metadata: c.metadata,
      vip_score: score?.vip_score || 0,
      current_tier: score?.current_tier || "pending",
      referral_count: referralCountMap.get(c.id) || 0,
      created_at: c.created_at,
    }
  })

  res.json({ members, count: total, limit, offset })
}
