"use client"

import { useCallback } from "react"
import { sdk } from "@lib/config"

export function getOrCreateSessionId(): string {
  if (typeof document === "undefined") return ""
  const match = document.cookie.split("; ").find((r) => r.startsWith("hg_sid="))
  if (match) return match.split("=")[1]
  const id = crypto.randomUUID()
  document.cookie = `hg_sid=${id}; max-age=${365 * 24 * 60 * 60}; path=/; samesite=lax`
  return id
}

export function useTrack() {
  return useCallback(
    (event_type: string, payload: Record<string, unknown> = {}) => {
      const session_id = getOrCreateSessionId()
      if (!session_id) return
      // event_id lets the backend dedupe retries/keepalive re-sends so a single
      // user action can't double-count in funnels/rates.
      const event_id = crypto.randomUUID()
      const sent = sdk.client.fetch("/store/events", {
        method: "POST",
        credentials: "include",
        keepalive: true,
        body: { event_type, session_id, payload, event_id },
      })
      void sent.catch(() => {})
    },
    [],
  )
}
