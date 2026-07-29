import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  VIP_DIRECT_MULTIPLIER,
  VIP_INDIRECT_MULTIPLIER,
  VIP_ROLLING_WINDOW_MONTHS,
} from "../constants/vip-tiers"
import { VIP_SCORE_MODULE } from "../../modules/vip-score"
import { REFERRAL_MODULE } from "../../modules/referral"
import { SITE_CONFIG_MODULE } from "../../modules/site-config"

export type VipConfig = {
  directMultiplier: number
  indirectMultiplier: number
  rollingWindowMonths: number
}

const DEFAULT_VIP_CONFIG: VipConfig = {
  directMultiplier: VIP_DIRECT_MULTIPLIER,
  indirectMultiplier: VIP_INDIRECT_MULTIPLIER,
  rollingWindowMonths: VIP_ROLLING_WINDOW_MONTHS,
}

async function resolveVipConfig(container: any): Promise<VipConfig> {
  try {
    const svc = container.resolve(SITE_CONFIG_MODULE) as any
    const [direct, indirect, window] = await Promise.all([
      svc.get("vip_direct_multiplier"),
      svc.get("vip_indirect_multiplier"),
      svc.get("vip_rolling_window_months"),
    ])
    return {
      directMultiplier: typeof direct === "number" ? direct : DEFAULT_VIP_CONFIG.directMultiplier,
      indirectMultiplier:
        typeof indirect === "number" ? indirect : DEFAULT_VIP_CONFIG.indirectMultiplier,
      rollingWindowMonths:
        typeof window === "number" ? window : DEFAULT_VIP_CONFIG.rollingWindowMonths,
    }
  } catch {
    return DEFAULT_VIP_CONFIG
  }
}

type CalculateVipScoreInput = {
  customer_id: string
}

export type CalculateVipScoreOutput = {
  customer_id: string
  personal_spend: number
  direct_referral_spend: number
  indirect_referral_spend: number
  vip_score: number
  order_count_window: number
}

type OrderRow = {
  id: string
  total?: number | string | null
  created_at?: string | Date | null
  customer_id?: string | null
  payment_collections?: Array<{ status?: string | null; captured_amount?: number | null }> | null
}

function windowStart(now: Date, rollingWindowMonths: number): Date {
  const d = new Date(now)
  d.setMonth(d.getMonth() - rollingWindowMonths)
  return d
}

function sumCaptured(orders: OrderRow[], since: Date): { total: number; count: number } {
  let total = 0
  let count = 0
  for (const o of orders) {
    if (!o.created_at) continue
    const createdAt = new Date(o.created_at as any)
    if (createdAt < since) continue
    // Determine captured status from payment_collections (payment_status is not
    // a scalar on the order entity in Medusa v2 query.graph).
    const collections = o.payment_collections ?? []
    const isCaptured =
      collections.length === 0
        ? false
        : collections.some((pc) => pc.status === "completed" || (pc.captured_amount ?? 0) > 0)
    if (!isCaptured) continue
    total += Number(o.total ?? 0) || 0
    count += 1
  }
  return { total, count }
}

async function fetchCustomerOrders(query: any, customerId: string): Promise<OrderRow[]> {
  const { data } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "total",
      "created_at",
      "customer_id",
      "payment_collections.status",
      "payment_collections.captured_amount",
    ],
    filters: { customer_id: customerId },
  })
  return (data || []) as OrderRow[]
}

export const calculateVipScoreStep = createStep(
  "calculate-vip-score",
  async (
    input: CalculateVipScoreInput,
    { container }
  ): Promise<StepResponse<CalculateVipScoreOutput>> => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const vipScoreService = container.resolve(VIP_SCORE_MODULE) as any
    const referralService = container.resolve(REFERRAL_MODULE) as any
    // Read VIP config ONCE per workflow run (not per row).
    const vipConfig = await resolveVipConfig(container)
    const result = await calculateVipScore(
      input,
      { query, vipScoreService, referralService, vipConfig },
      new Date()
    )
    return new StepResponse(result)
  }
)

/**
 * Pure, testable implementation extracted from the workflow step.
 * Injects the three services it needs so unit tests can supply fakes
 * without spinning up Medusa's workflow runtime.
 */
export async function calculateVipScore(
  input: CalculateVipScoreInput,
  deps: {
    query: { graph(args: any): Promise<{ data: OrderRow[] }> }
    vipScoreService: any
    referralService: any
    vipConfig?: VipConfig
  },
  now: Date = new Date()
): Promise<CalculateVipScoreOutput> {
  const { query, vipScoreService, referralService } = deps
  const vipConfig = deps.vipConfig ?? DEFAULT_VIP_CONFIG
  const since = windowStart(now, vipConfig.rollingWindowMonths)

  // 1. Personal spend
  const personalOrders = await fetchCustomerOrders(query, input.customer_id)
  const personal = sumCaptured(personalOrders, since)

  // 2. Direct referrals (stealth_mode excluded)
  const directReferrals = (await referralService.listReferrals({
    referrer_customer_id: input.customer_id,
    stealth_mode: false,
  })) as Array<{ referred_customer_id: string }>

  let directSpend = 0
  for (const ref of directReferrals) {
    const orders = await fetchCustomerOrders(query, ref.referred_customer_id)
    directSpend += sumCaptured(orders, since).total
  }

  // 3. Indirect referrals (2 hops): for each direct referral B, walk B's own referrals.
  // No double-count: each C contributes exactly once via its B->C edge when scoring A.
  let indirectSpend = 0
  for (const ref of directReferrals) {
    const secondHop = (await referralService.listReferrals({
      referrer_customer_id: ref.referred_customer_id,
      stealth_mode: false,
    })) as Array<{ referred_customer_id: string }>

    for (const grand of secondHop) {
      const orders = await fetchCustomerOrders(query, grand.referred_customer_id)
      indirectSpend += sumCaptured(orders, since).total
    }
  }

  const spendScore =
    personal.total +
    vipConfig.directMultiplier * directSpend +
    vipConfig.indirectMultiplier * indirectSpend

  // Add bonus events (onboarding steps, referral signups) in the rolling window.
  const bonusInWindow = await vipScoreService.getBonusPointsInWindow(input.customer_id, since)
  const lifetimeBonusPoints = await vipScoreService.getLifetimeBonusPoints(input.customer_id)
  const vipScore = spendScore + bonusInWindow

  // Upsert vip_score row.
  //   personal_spend_12mo  -> personal spend in the rolling window
  //   direct/indirect_spend_12mo -> referral spend breakdown (raw, pre-multiplier)
  //   order_count_12mo     -> personal orders in the rolling window
  const existing = await vipScoreService.listVipScores({
    customer_id: input.customer_id,
  })

  const payload = {
    personal_spend_12mo: personal.total,
    direct_spend_12mo: directSpend,
    indirect_spend_12mo: indirectSpend,
    vip_score: vipScore,
    order_count_12mo: personal.count,
    lifetime_points: lifetimeBonusPoints,
    last_evaluated_at: now,
  }

  if (existing.length) {
    await vipScoreService.updateVipScores({ id: existing[0].id, ...payload })
  } else {
    try {
      await vipScoreService.createVipScores({
        customer_id: input.customer_id,
        current_tier: "approved",
        tier_achieved_at: now,
        ...payload,
      })
    } catch (err) {
      // A concurrent run may have created the row first (unique customer_id).
      // Re-read and update rather than failing.
      const [again] = await vipScoreService.listVipScores({
        customer_id: input.customer_id,
      })
      if (again) {
        await vipScoreService.updateVipScores({ id: again.id, ...payload })
      } else {
        throw err
      }
    }
  }

  return {
    customer_id: input.customer_id,
    personal_spend: personal.total,
    direct_referral_spend: directSpend,
    indirect_referral_spend: indirectSpend,
    vip_score: vipScore,
    order_count_window: personal.count,
  }
}
