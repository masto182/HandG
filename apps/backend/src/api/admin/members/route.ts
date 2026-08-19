import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { VIP_SCORE_MODULE } from "../../../modules/vip-score"
import { REFERRAL_MODULE } from "../../../modules/referral"
import { ANALYTICS_MODULE } from "../../../modules/analytics"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerModule = req.scope.resolve(Modules.CUSTOMER) as any
  const vipScoreService = req.scope.resolve(VIP_SCORE_MODULE) as any
  const referralService = req.scope.resolve(REFERRAL_MODULE) as any
  const analyticsService = req.scope.resolve(ANALYTICS_MODULE) as any

  const {
    group,
    q,
    limit: rawLimit,
    offset: rawOffset,
  } = req.query as {
    group?: string
    q?: string
    limit?: string
    offset?: string
  }
  const limit = Math.min(parseInt(rawLimit || "50", 10) || 50, 200)
  const offset = parseInt(rawOffset || "0", 10) || 0

  const isVipGroup = (c: any) => c.groups?.some((g: any) => /^vip\d/.test(g.name))

  // Build service-level filters where possible to avoid loading all customers.
  // `q` is supported natively by the customer module for email/name search.
  const serviceFilters: Record<string, unknown> = q ? { q } : {}

  // Load only the data needed: full list with groups for filtering + counts.
  // A future improvement would push group filtering to service level too, but
  // that requires the group ID which needs a separate lookup.
  const allCustomers = await customerModule.listCustomers(serviceFilters, {
    relations: ["groups"],
  })

  let filtered = allCustomers
  if (group === "vip") {
    filtered = filtered.filter(isVipGroup)
  } else if (group && group !== "all") {
    filtered = filtered.filter((c: any) => c.groups?.some((g: any) => g.name === group))
  }

  const total = filtered.length
  const page = filtered.slice(offset, offset + limit) as any[]

  // Scope vip scores and referrals to ONLY the current page — avoids loading
  // the entire table on every request.
  const pageIds = page.map((c: any) => c.id)
  const referrerAndPage = new Set(pageIds)

  const [pageScores, pageReferrals] = await Promise.all([
    pageIds.length ? vipScoreService.listVipScores({ customer_id: pageIds }) : [],
    pageIds.length ? referralService.listReferrals({ referrer_customer_id: pageIds }) : [],
  ])

  const lastActiveMap: Map<string, string> = pageIds.length
    ? await analyticsService.getLastActiveByCustomerIds(pageIds)
    : new Map()

  const scoreMap = new Map(pageScores.map((s: any) => [s.customer_id, s]))
  const referralCountMap = new Map<string, number>()
  const referredByIds = new Set<string>()

  for (const r of pageReferrals) {
    const count = referralCountMap.get(r.referrer_customer_id) || 0
    referralCountMap.set(r.referrer_customer_id, count + 1)
  }

  // Fetch referred_by info for members on this page who were referred by someone.
  const pageReferredBy = await referralService.listReferrals({
    referred_customer_id: pageIds,
  })
  for (const r of pageReferredBy) {
    referredByIds.add(r.referrer_customer_id)
  }
  const referredByCustomers = referredByIds.size
    ? await customerModule.listCustomers({ id: [...referredByIds] }, {})
    : []
  const referredByScores = referredByIds.size
    ? await vipScoreService.listVipScores({ customer_id: [...referredByIds] })
    : []

  const referrerCustomerMap = new Map(referredByCustomers.map((c: any) => [c.id, c]))
  const referrerScoreMap = new Map(referredByScores.map((s: any) => [s.customer_id, s]))
  const referredByMap = new Map(
    pageReferredBy.map((r: any) => [r.referred_customer_id, r.referrer_customer_id])
  )

  const members = page.map((c: any) => {
    const score = scoreMap.get(c.id) as any
    const refId = referredByMap.get(c.id)
    const refC = refId ? (referrerCustomerMap.get(refId) as any) : null
    const refScore = refId ? (referrerScoreMap.get(refId) as any) : null
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
      referred_by: refId
        ? {
            id: refId,
            name: refC
              ? `${refC.first_name || ""} ${refC.last_name || ""}`.trim() || refC.email
              : "Unknown",
            tier: refScore?.current_tier || "approved",
          }
        : null,
      created_at: c.created_at,
      last_active: lastActiveMap.get(c.id) ?? null,
    }
  })

  // Counts use the full (q-filtered) list — group counts aren't affected by
  // the pagination window.
  const inGroup = (c: any, name: string) => c.groups?.some((g: any) => g.name === name)
  const counts = {
    all: allCustomers.length,
    pending: allCustomers.filter((c: any) => inGroup(c, "pending")).length,
    approved: allCustomers.filter((c: any) => inGroup(c, "approved")).length,
    vip: allCustomers.filter(isVipGroup).length,
    suspended: allCustomers.filter((c: any) => inGroup(c, "suspended")).length,
  }

  res.json({ members, count: total, limit, offset, counts })
}
