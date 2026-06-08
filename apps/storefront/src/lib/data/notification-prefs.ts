"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders } from "./cookies"

export type NotificationPref = {
  category: string
  enabled: boolean
}

export async function getNotificationPreferences(): Promise<
  NotificationPref[]
> {
  try {
    const headers = await getAuthHeaders()
    if (!headers.authorization) return []
    const res = await sdk.client.fetch<{ preferences: NotificationPref[] }>(
      "/store/customers/me/notifications/preferences",
      { method: "GET", headers, next: { revalidate: 0 } },
    )
    return res.preferences ?? []
  } catch {
    return []
  }
}
