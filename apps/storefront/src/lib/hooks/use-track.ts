"use client"

import { useCallback } from "react"
import { sdk } from "@lib/config"

function getOrCreateSessionId(): string {
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
      const sent = sdk.client.fetch("/store/events", {
        method: "POST",
        body: { event_type, session_id, payload },
      })
      void sent.catch(() => {})
    },
    [],
  )
}
