"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { sdk } from "@lib/config"
import { getOrCreateSessionId } from "@lib/hooks/use-track"

const HEARTBEAT_INTERVAL_MS = 30_000

function sendHeartbeat(path: string) {
  const session_id = getOrCreateSessionId()
  if (!session_id) return
  const referrer =
    typeof document !== "undefined" ? document.referrer || undefined : undefined
  const sent = sdk.client.fetch("/store/sessions/heartbeat", {
    method: "POST",
    credentials: "include",
    keepalive: true,
    body: { session_id, path, referrer },
  })
  void sent.catch(() => {})
}

function sendPageView(path: string) {
  const session_id = getOrCreateSessionId()
  if (!session_id) return
  const sent = sdk.client.fetch("/store/events", {
    method: "POST",
    credentials: "include",
    keepalive: true,
    body: {
      event_type: "page.viewed",
      session_id,
      payload: {
        path,
        referrer:
          typeof document !== "undefined"
            ? document.referrer || undefined
            : undefined,
      },
      event_id: crypto.randomUUID(),
    },
  })
  void sent.catch(() => {})
}

/**
 * Mounted once in the root storefront layout. Fires a page.viewed event on
 * every route change and a heartbeat every 30s while the tab is visible, so
 * admin Insights can show last-active time and active session duration.
 */
export default function SessionActivityTracker() {
  const pathname = usePathname()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!pathname) return
    sendPageView(pathname)
    sendHeartbeat(pathname)
  }, [pathname])

  useEffect(() => {
    function startInterval() {
      if (intervalRef.current) return
      intervalRef.current = setInterval(() => {
        if (document.visibilityState === "visible") {
          sendHeartbeat(window.location.pathname)
        }
      }, HEARTBEAT_INTERVAL_MS)
    }
    function stopInterval() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        sendHeartbeat(window.location.pathname)
        startInterval()
      } else {
        stopInterval()
      }
    }

    if (document.visibilityState === "visible") startInterval()
    document.addEventListener("visibilitychange", handleVisibility)
    window.addEventListener("pagehide", () =>
      sendHeartbeat(window.location.pathname),
    )

    return () => {
      stopInterval()
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [])

  return null
}
