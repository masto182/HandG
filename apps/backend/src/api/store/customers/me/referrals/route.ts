import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { REFERRAL_MODULE } from "../../../../../modules/referral"
import { SITE_CONFIG_MODULE } from "../../../../../modules/site-config"
import type SiteConfigModuleService from "../../../../../modules/site-config/service"
import crypto from "crypto"

function generateReferralCode(name: string): string {
  const prefix = (name || "HG").replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase()
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
    await customerModule.updateCustomers(customerId, {
      metadata: { ...(customer.metadata as any || {}), referral_code: referralCode },
    })
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

  if (referredIds.length > 0) {
    try {
      const orderModule = req.scope.resolve(Modules.ORDER)
      for (const refId of referredIds) {
        const orders = await orderModule.listOrders({ customer_id: refId })
        if (orders.length > 0) {
          rewarded++
        }
      }
    } catch {}
  }

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
    },
    referrals: referrals.map((r: any) => ({
      id: r.id,
      referred_customer_id: r.referred_customer_id,
      stealth_mode: r.stealth_mode,
      created_at: r.created_at,
    })),
  })
}
