"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders } from "./cookies"

type HopAlertDTO = {
  id: string
  customer_id: string
  hop_id: string
  channel_email: boolean
  channel_inapp: boolean
}

export async function getMyHopAlerts(): Promise<HopAlertDTO[]> {
  try {
    const headers = await getAuthHeaders()
    if (!headers.authorization) return []
    const res = await sdk.client.fetch<{ hop_alerts: HopAlertDTO[] }>(
      "/store/customers/me/hop-alerts",
      { method: "GET", headers, next: { revalidate: 0 } },
    )
    return res.hop_alerts ?? []
  } catch {
    return []
  }
}

export async function getMyHopAlert(
  hopId: string,
): Promise<HopAlertDTO | null> {
  try {
    const headers = await getAuthHeaders()
    if (!headers.authorization) return null
    const res = await sdk.client.fetch<{ hop_alerts: HopAlertDTO[] }>(
      `/store/customers/me/hop-alerts?hop_id=${encodeURIComponent(hopId)}`,
      { method: "GET", headers, next: { revalidate: 0 } },
    )
    return res.hop_alerts?.[0] ?? null
  } catch {
    return null
  }
}

export async function subscribeHopAlert(hopId: string): Promise<boolean> {
  try {
    const headers = await getAuthHeaders()
    if (!headers.authorization) return false
    await sdk.client.fetch("/store/customers/me/hop-alerts", {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: { hop_id: hopId },
    })
    return true
  } catch {
    return false
  }
}

export async function unsubscribeHopAlert(hopId: string): Promise<boolean> {
  try {
    const headers = await getAuthHeaders()
    if (!headers.authorization) return false
    await sdk.client.fetch("/store/customers/me/hop-alerts", {
      method: "DELETE",
      headers: { ...headers, "content-type": "application/json" },
      body: { hop_id: hopId },
    })
    return true
  } catch {
    return false
  }
}

export async function updateHopAlertChannels(
  hopId: string,
  channels: { channel_email?: boolean; channel_inapp?: boolean },
): Promise<boolean> {
  try {
    const headers = await getAuthHeaders()
    if (!headers.authorization) return false
    await sdk.client.fetch("/store/customers/me/hop-alerts", {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: { hop_id: hopId, ...channels },
    })
    return true
  } catch {
    return false
  }
}
