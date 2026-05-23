"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders } from "./cookies"

export type ReferralStatus = "active" | "signed_up" | "pending"

export type ReferralHistoryEntry = {
  id: string
  initials: string
  name: string
  signed_up: string
  first_order: string | null
  contribution: number
  status: ReferralStatus
}

export type ReferralData = {
  referral_code: string | null
  invite_link: string | null
  stats: {
    total_referrals: number
    rewarded_referrals: number
    network_contribution: number
    contribution_value: number
    growth_last_month: number
  }
  history: ReferralHistoryEntry[]
  total_history_count: number
  stealth_mode: boolean
}

export async function getReferralData(): Promise<ReferralData | null> {
  const headers = await getAuthHeaders()
  if (!headers.authorization) return null

  try {
    const data = await sdk.client.fetch<any>(
      "/store/customers/me/referrals",
      { method: "GET", headers }
    )
    if (!data) return null

    return {
      referral_code: data.referral_code ?? null,
      invite_link: data.invite_link ?? null,
      stats: {
        total_referrals: data.stats?.total_referrals ?? 0,
        rewarded_referrals: data.stats?.rewarded_referrals ?? 0,
        network_contribution: data.stats?.network_contribution ?? 0,
        contribution_value: data.stats?.contribution_value ?? 0,
        growth_last_month: data.stats?.growth_last_month ?? 0,
      },
      history: Array.isArray(data.history) ? data.history : (Array.isArray(data.referrals) ? data.referrals : []),
      total_history_count: data.total_history_count ?? data.history?.length ?? data.referrals?.length ?? 0,
      stealth_mode: data.stealth_mode ?? false,
    }
  } catch (e) {
    console.error("[Referrals] getReferralData error:", e)
    return null
  }
}
