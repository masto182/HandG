"use server"

import { sdk } from "@lib/config"

export async function listAnnouncements(): Promise<any[]> {
  try {
    const data = await sdk.client.fetch<{ announcements: any[] }>(
      "/store/announcements",
      { method: "GET" }
    )
    return data.announcements || []
  } catch {
    return []
  }
}
