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

type PatchResult =
  | {
      updated: true
      entry: {
        category: string
        label: string
        description: string
        transactional: boolean
        enabled: boolean
      }
    }
  | { updated: false; noticeMessage: string }

export async function updateNotificationPreference(
  category: string,
  enabled: boolean,
): Promise<PatchResult> {
  const headers = await getAuthHeaders()
  if (!headers.authorization) throw new Error("Unauthorized")
  return sdk.client.fetch<PatchResult>(
    "/store/customers/me/notifications/preferences",
    { method: "POST", body: { category, enabled } as any, headers },
  )
}
