import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import approveMemberWorkflow from "../../../../../workflows/approve-member"
import { REFERRAL_MODULE } from "../../../../../modules/referral"
import { VIP_SCORE_MODULE } from "../../../../../modules/vip-score"
import evaluateVipProgressionWorkflow from "../../../../../workflows/evaluate-vip-progression"
import { createInboxNotification } from "../../../../../lib/create-inbox-notification"

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  const { result } = await approveMemberWorkflow(req.scope).run({
    input: { customer_id: id },
  })

  // Award referral signup bonus (50 pts) to whoever referred this member.
  const referralService = req.scope.resolve(REFERRAL_MODULE) as any
  const vipScoreService = req.scope.resolve(VIP_SCORE_MODULE) as any
  const referrals = await referralService.listReferrals({ referred_customer_id: id })
  if (referrals.length > 0) {
    const referrerId = referrals[0].referrer_customer_id
    vipScoreService
      .addReferralSignupBonus(referrerId, id)
      .then(({ inserted }: { inserted: boolean }) => {
        if (inserted) {
          evaluateVipProgressionWorkflow(req.scope)
            .run({
              input: { customer_id: referrerId },
            })
            .catch(() => {})
          createInboxNotification(
            req.scope,
            referrerId,
            "referral_signup",
            "Your referral joined",
            "Someone you referred just became a member — +50 pts added to your account.",
            { referred_customer_id: id }
          )
        }
      })
      .catch(() => {})
  }

  // Welcome notification for the approved member.
  createInboxNotification(
    req.scope,
    id,
    "welcome",
    "Welcome to Hops & Glory",
    "You're in. Complete your setup and earn up to 110 VIP points.",
    { cta: "/account/getting-started" }
  )

  res.json({
    success: true,
    referral_code: (result as any).referral_code,
  })
}
