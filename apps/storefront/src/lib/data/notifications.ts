"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders } from "./cookies"

export type NotificationItem = {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  created_at: string
  metadata?: {
    handle?: string
    cta?: string
    link_url?: string
    link_text?: string
  } | null
}

export type NotificationsPage = {
  notifications: NotificationItem[]
  count: number
  unread_count: number
}

export async function getMyNotifications(
  opts: { limit?: number; offset?: number; unread?: boolean } = {},
): Promise<NotificationsPage> {
  try {
    const headers = await getAuthHeaders()
    if (!headers.authorization) {
      return { notifications: [], count: 0, unread_count: 0 }
    }

    const params = new URLSearchParams()

    if (typeof opts.limit === "number") {
      params.set("limit", String(opts.limit))
    }

    if (typeof opts.offset === "number") {
      params.set("offset", String(opts.offset))
    }

    if (opts.unread) {
      params.set("unread", "true")
    }

    const query = params.toString()
    const res = await sdk.client.fetch<NotificationsPage>(
      `/store/customers/me/notifications${query ? `?${query}` : ""}`,
      { method: "GET", headers, next: { revalidate: 0 } },
    )

    return {
      notifications: res.notifications ?? [],
      count: res.count ?? 0,
      unread_count: res.unread_count ?? 0,
    }
  } catch {
    return { notifications: [], count: 0, unread_count: 0 }
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  const headers = await getAuthHeaders()
  if (!headers.authorization) throw new Error("Unauthorized")

  await sdk.client.fetch("/store/customers/me/notifications/read", {
    method: "POST",
    body: { ids: [id] } as any,
    headers,
  })
}

export async function markAllNotificationsRead(): Promise<void> {
  const headers = await getAuthHeaders()
  if (!headers.authorization) throw new Error("Unauthorized")

  await sdk.client.fetch("/store/customers/me/notifications/read-all", {
    method: "POST",
    headers,
  })
}

export async function deleteNotification(id: string): Promise<void> {
  const headers = await getAuthHeaders()
  if (!headers.authorization) throw new Error("Unauthorized")

  await sdk.client.fetch(`/store/customers/me/notifications/${id}`, {
    method: "DELETE",
    headers,
  })
}
