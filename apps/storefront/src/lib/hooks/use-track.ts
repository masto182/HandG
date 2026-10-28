"use client"

import { useCallback } from "react"

export function postTrack(url: string, body: unknown): void {
  try {
    void fetch(url, {
      method: "POST",
      keepalive: true,
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {})
  } catch {}
}

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
      postTrack("/api/track/event", {
        event_type,
        session_id,
        payload,
        event_id,
      })
    },
    [],
  )
}
