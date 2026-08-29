import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { REFERRAL_MODULE } from "../../../../../modules/referral"
import { VIP_SCORE_MODULE } from "../../../../../modules/vip-score"
import { VIP_EVENT_TYPES } from "../../../../../modules/vip-score/service"
import { SITE_CONFIG_MODULE } from "../../../../../modules/site-config"
import type SiteConfigModuleService from "../../../../../modules/site-config/service"
import crypto from "crypto"

function formatDate(value: unknown): string | null {
  if (!value) return null
  const d = new Date(value as string)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
}

function generateReferralCode(name: string): string {
  const prefix = (name || "HG")
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 3)
    .toUpperCase()
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase()
  return `${prefix}-${suffix}`
}

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const customerModule = req.scope.resolve(Modules.CUSTOMER)

  const [customer] = await customerModule.listCustomers({ id: customerId })
  let referralCode = (customer?.metadata as any)?.referral_code || null

  if (!referralCode && customer) {
    referralCode = generateReferralCode(customer.first_name || "")
    const codeMeta = {
      metadata: { ...((customer.metadata as any) || {}), referral_code: referralCode },
    }
    await customerModule.updateCustomers(customerId, codeMeta) // workflow-exempt: single customer field update
    // Keep the indexed lookup table in sync so the code resolves in validate.
    try {
      const referralService = req.scope.resolve(REFERRAL_MODULE) as any
      await referralService.createReferralCodes({ customer_id: customerId, code: referralCode }) // workflow-exempt
    } catch {
      // unique conflict / already present — ignore
    }
  }

  let referrals: any[] = []
  try {
    const referralService = req.scope.resolve(REFERRAL_MODULE) as any
    referrals = await referralService.listReferrals({
      referrer_customer_id: customerId,
    })
  } catch {}

  const referredIds = referrals.map((r: any) => r.referred_customer_id)
  let rewarded = 0
  const referredCustomers = new Map<
    string,
    { first_name: string | null; last_name: string | null; email: string }
  >()
  const firstOrderDates = new Map<string, string>()
  const contributionByReferredId = new Map<string, number>()

  try {
    const vipScoreService = req.scope.resolve(VIP_SCORE_MODULE) as any
    const bonusEvents = await vipScoreService.listVipEvents({
      customer_id: customerId,
      type: VIP_EVENT_TYPES.REFERRAL_SIGNUP,
    })
    for (const event of bonusEvents) {
      const existing = contributionByReferredId.get(event.reference_id) || 0
      contributionByReferredId.set(event.reference_id, existing + (event.points ?? 0))
    }
  } catch {}

  if (referredIds.length > 0) {
    try {
      const referredList = await customerModule.listCustomers({ id: referredIds })
      for (const rc of referredList) {
        referredCustomers.set(rc.id, {
          first_name: rc.first_name,
          last_name: rc.last_name,
          email: rc.email,
        })
      }
    } catch {}

    try {
      const orderModule = req.scope.resolve(Modules.ORDER)
      for (const refId of referredIds) {
        const orders = await orderModule.listOrders(
          { customer_id: refId },
          { order: { created_at: "ASC" } }
        )
        if (orders.length > 0) {
          rewarded++
          firstOrderDates.set(refId, orders[0].created_at as unknown as string)
        }
      }
    } catch {}
  }

  const history = referrals.map((r: any) => {
    const rc = referredCustomers.get(r.referred_customer_id)
    const name =
      [rc?.first_name, rc?.last_name].filter(Boolean).join(" ").trim() || rc?.email || "Referral"
    const initials =
      [rc?.first_name?.[0], rc?.last_name?.[0]].filter(Boolean).join("").toUpperCase() ||
      name[0]?.toUpperCase() ||
      "?"
    const firstOrder = firstOrderDates.get(r.referred_customer_id) || null

    return {
      id: r.id,
      referred_customer_id: r.referred_customer_id,
      stealth_mode: r.stealth_mode,
      name,
      initials,
      signed_up: formatDate(r.created_at) || "—",
      first_order: formatDate(firstOrder),
      contribution: contributionByReferredId.get(r.referred_customer_id) || 0,
      status: firstOrder ? "active" : "signed_up",
    }
  })

  const networkContribution = Array.from(contributionByReferredId.values()).reduce(
    (sum, points) => sum + points,
    0
  )

  // Resolve store URL via SiteConfig (DB > env > default).
  let storeUrl = process.env.STORE_URL || "https://example.com"
  try {
    const siteConfig = req.scope.resolve(SITE_CONFIG_MODULE) as SiteConfigModuleService
    storeUrl = await siteConfig.get<string>("store_url")
  } catch {}

  res.json({
    referral_code: referralCode,
    invite_link: referralCode ? `${storeUrl}/apply?ref=${referralCode}` : null,
    stats: {
      total_referrals: referrals.length,
      rewarded_referrals: rewarded,
      network_contribution: networkContribution,
      contribution_value: 0,
      growth_last_month: 0,
    },
    history,
    total_history_count: history.length,
    stealth_mode: false,
  })
}
