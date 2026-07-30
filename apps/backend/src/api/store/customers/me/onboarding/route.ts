import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { VIP_SCORE_MODULE } from "../../../../../modules/vip-score"
import {
  ONBOARDING_STEPS,
  MAX_ONBOARDING_POINTS,
} from "../../../../../modules/vip-score/onboarding-steps"
import evaluateVipProgressionWorkflow from "../../../../../workflows/evaluate-vip-progression"
import { createInboxNotification } from "../../../../../lib/create-inbox-notification"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const vipScoreService = req.scope.resolve(VIP_SCORE_MODULE) as any

  const stepsCompleted = await vipScoreService.getCompletedOnboardingSteps(customerId)
  const [scoreRecord] = await vipScoreService.listVipScores({
    customer_id: customerId,
  })

  const pointsEarned = stepsCompleted.reduce(
    (sum: number, stepId: string) => sum + (ONBOARDING_STEPS[stepId]?.points ?? 0),
    0
  )

  res.json({
    steps_completed: stepsCompleted,
    points_earned: pointsEarned,
    max_points: MAX_ONBOARDING_POINTS,
    pct_complete: Math.round((stepsCompleted.length / Object.keys(ONBOARDING_STEPS).length) * 100),
    steps: ONBOARDING_STEPS,
    vip_score: scoreRecord?.vip_score ?? 0,
    lifetime_points: scoreRecord?.lifetime_points ?? 0,
    current_tier: scoreRecord?.current_tier ?? "approved",
  })
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const { step_id } = req.body as { step_id: string }

  if (!step_id || !ONBOARDING_STEPS[step_id]) {
    return res.status(400).json({ message: `Unknown step_id: ${step_id}` })
  }

  const vipScoreService = req.scope.resolve(VIP_SCORE_MODULE) as any
  const step = ONBOARDING_STEPS[step_id]

  const { inserted } = await vipScoreService.addOnboardingBonus(customerId, step_id, step.points)

  if (inserted) {
    let progressionResult: any = null
    try {
      const { result } = await evaluateVipProgressionWorkflow(req.scope).run({
        input: { customer_id: customerId },
      })
      progressionResult = result
    } catch (err) {
      const logger = req.scope.resolve("logger") as any
      logger.warn(
        `[Onboarding] VIP progression failed for step ${step_id}: ${err instanceof Error ? err.message : String(err)}`
      )
    }

    if ((progressionResult as any)?.promoted === true) {
      const newTier = (progressionResult as any).new_tier || "vip"
      createInboxNotification(
        req.scope,
        customerId,
        "tier_upgrade",
        `You've reached ${newTier.toUpperCase()}`,
        `Your VIP score crossed the ${newTier} threshold. New early-access perks are now active.`,
        { new_tier: newTier, cta: "/account/vip" }
      )
    }

    const stepsCompleted = await vipScoreService.getCompletedOnboardingSteps(customerId)
    const [scoreRecord] = await vipScoreService.listVipScores({
      customer_id: customerId,
    })
    const pointsEarned = stepsCompleted.reduce(
      (sum: number, sid: string) => sum + (ONBOARDING_STEPS[sid]?.points ?? 0),
      0
    )

    // 50% milestone notification (fires exactly once — inbox creation is idempotent
    // for this type via the unique constraint in the business logic? No — we check manually)
    const halfPoints = Math.floor(MAX_ONBOARDING_POINTS / 2)
    const prevPoints = pointsEarned - step.points
    if (prevPoints < halfPoints && pointsEarned >= halfPoints) {
      createInboxNotification(
        req.scope,
        customerId,
        "onboarding_halfway",
        "Halfway there",
        `You've earned ${pointsEarned} pts from your setup — VIP1 is within reach.`,
        { cta: "/account/getting-started" }
      )
    }

    return res.json({
      step_id,
      points_awarded: step.points,
      already_claimed: false,
      tier_promoted: (progressionResult as any)?.promoted ?? false,
      new_tier: (progressionResult as any)?.new_tier ?? null,
      steps_completed: stepsCompleted,
      points_earned: pointsEarned,
      max_points: MAX_ONBOARDING_POINTS,
      pct_complete: Math.round(
        (stepsCompleted.length / Object.keys(ONBOARDING_STEPS).length) * 100
      ),
      vip_score: scoreRecord?.vip_score ?? 0,
      lifetime_points: scoreRecord?.lifetime_points ?? 0,
      current_tier: scoreRecord?.current_tier ?? "approved",
    })
  }

  return res.json({
    step_id,
    points_awarded: 0,
    already_claimed: true,
  })
}
