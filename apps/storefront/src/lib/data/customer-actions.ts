"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders } from "./cookies"

export async function getVipStatus(): Promise<any | null> {
  const headers = await getAuthHeaders()
  if (!headers.authorization) return null

  try {
    const data = await sdk.client.fetch<any>(
      "/store/customers/me/vip",
      { method: "GET", headers }
    )
    return data
  } catch {
    return null
  }
}

export async function getMembershipDetails(): Promise<any | null> {
  const headers = await getAuthHeaders()
  if (!headers.authorization) return null

  try {
    const data = await sdk.client.fetch<any>(
      "/store/customers/me/membership",
      { method: "GET", headers }
    )
    return data
  } catch {
    return null
  }
}

export async function listRestockAlerts(): Promise<any[]> {
  const headers = await getAuthHeaders()
  if (!headers.authorization) return []

  try {
    const data = await sdk.client.fetch<{ restock_alerts: any[] }>(
      "/store/customers/me/restock-alerts",
      { method: "GET", headers }
    )
    return data.restock_alerts || []
  } catch {
    return []
  }
}

export async function createRestockAlert(body: {
  product_id?: string
  beer_name: string
  brewery_name: string
}): Promise<any | null> {
  const headers = await getAuthHeaders()
  if (!headers.authorization) return null

  try {
    const data = await sdk.client.fetch<{ restock_alert: any }>(
      "/store/customers/me/restock-alerts",
      {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body,
      }
    )
    return data.restock_alert || null
  } catch {
    return null
  }
}

export async function deleteRestockAlert(id: string): Promise<boolean> {
  const headers = await getAuthHeaders()
  if (!headers.authorization) return false

  try {
    await sdk.client.fetch(
      `/store/customers/me/restock-alerts/${id}`,
      { method: "DELETE", headers }
    )
    return true
  } catch {
    return false
  }
}

export async function uploadAvatar(formData: FormData): Promise<string | null> {
  const headers = await getAuthHeaders()
  if (!headers.authorization) return null

  try {
    const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
    // sdk-exempt: SDK client does not support multipart/form-data uploads cleanly
    const res = await fetch(`${backendUrl}/store/customers/me/avatar`, { // sdk-exempt
      method: "POST",
      headers: { ...headers },
      body: formData,
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.avatar_url || null
  } catch {
    return null
  }
}

export async function removeAvatar(): Promise<boolean> {
  const headers = await getAuthHeaders()
  if (!headers.authorization) return false

  try {
    await sdk.client.fetch(
      "/store/customers/me/avatar",
      { method: "DELETE", headers }
    )
    return true
  } catch {
    return false
  }
}

export async function registerCustomer(profile: Record<string, any>): Promise<any> {
  try {
    const data = await sdk.client.fetch<any>(
      "/store/customers/register",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: profile,
      }
    )
    return data
  } catch (e: any) {
    throw e
  }
}
