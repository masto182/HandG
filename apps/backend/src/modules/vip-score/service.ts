import { MedusaService } from "@medusajs/framework/utils"
import VipScore from "./models/vip-score"
import VipEvent from "./models/vip-event"

export const VIP_EVENT_TYPES = {
  SPEND_PERSONAL: "spend_personal",
  SPEND_DIRECT: "spend_direct",
  SPEND_INDIRECT: "spend_indirect",
  ONBOARDING_STEP: "onboarding_step",
  REFERRAL_SIGNUP: "referral_signup",
  ADMIN_ADJUSTMENT: "admin_adjustment",
} as const

class VipScoreModuleService extends MedusaService({
  VipScore,
  VipEvent,
}) {
  async recordBonusEvent(
    customerId: string,
    type: string,
    referenceId: string,
    points: number,
    note?: string
  ): Promise<{ inserted: boolean }> {
    const existing = await this.listVipEvents({
      customer_id: customerId,
      type,
      reference_id: referenceId,
    })
    if (existing.length > 0) {
      return { inserted: false }
    }
    await this.createVipEvents({
      customer_id: customerId,
      type,
      reference_id: referenceId,
      points,
      note: note ?? null,
    })
    await this.updateLifetimePoints(customerId)
    return { inserted: true }
  }

  async addOnboardingBonus(
    customerId: string,
    stepId: string,
    points: number
  ): Promise<{ inserted: boolean }> {
    return this.recordBonusEvent(customerId, VIP_EVENT_TYPES.ONBOARDING_STEP, stepId, points)
  }

  async addReferralSignupBonus(
    referrerId: string,
    referredCustomerId: string,
    points = 50
  ): Promise<{ inserted: boolean }> {
    return this.recordBonusEvent(
      referrerId,
      VIP_EVENT_TYPES.REFERRAL_SIGNUP,
      referredCustomerId,
      points,
      "Referred member approved"
    )
  }

  async getBonusPointsInWindow(customerId: string, windowStart: Date): Promise<number> {
    const events = await this.listVipEvents({
      customer_id: customerId,
    })
    return events
      .filter(
        (e: any) =>
          new Date(e.created_at) >= windowStart &&
          e.type !== VIP_EVENT_TYPES.SPEND_PERSONAL &&
          e.type !== VIP_EVENT_TYPES.SPEND_DIRECT &&
          e.type !== VIP_EVENT_TYPES.SPEND_INDIRECT
      )
      .reduce((sum: number, e: any) => sum + (e.points ?? 0), 0)
  }

  async getLifetimeBonusPoints(customerId: string): Promise<number> {
    const events = await this.listVipEvents({
      customer_id: customerId,
    })
    return events
      .filter(
        (e: any) =>
          e.type !== VIP_EVENT_TYPES.SPEND_PERSONAL &&
          e.type !== VIP_EVENT_TYPES.SPEND_DIRECT &&
          e.type !== VIP_EVENT_TYPES.SPEND_INDIRECT
      )
      .reduce((sum: number, e: any) => sum + (e.points ?? 0), 0)
  }

  async getCompletedOnboardingSteps(customerId: string): Promise<string[]> {
    const events = await this.listVipEvents({
      customer_id: customerId,
      type: VIP_EVENT_TYPES.ONBOARDING_STEP,
    })
    return events.map((e: any) => e.reference_id)
  }

  async getEventBreakdown(
    customerId: string,
    since?: Date
  ): Promise<Array<{ type: string; total_points: number; count: number }>> {
    const events = await this.listVipEvents({ customer_id: customerId })
    const filtered = since ? events.filter((e: any) => new Date(e.created_at) >= since) : events

    const grouped: Record<string, { total_points: number; count: number }> = {}
    for (const e of filtered as any[]) {
      if (!grouped[e.type]) grouped[e.type] = { total_points: 0, count: 0 }
      grouped[e.type].total_points += e.points ?? 0
      grouped[e.type].count += 1
    }
    return Object.entries(grouped).map(([type, data]) => ({ type, ...data }))
  }

  private async updateLifetimePoints(customerId: string): Promise<void> {
    const lifetime = await this.getLifetimeBonusPoints(customerId)
    const [scoreRecord] = await this.listVipScores({ customer_id: customerId })
    if (scoreRecord) {
      await this.updateVipScores({
        id: scoreRecord.id,
        lifetime_points: lifetime,
        last_reconciled_at: new Date(),
      })
    }
  }
}

export default VipScoreModuleService
