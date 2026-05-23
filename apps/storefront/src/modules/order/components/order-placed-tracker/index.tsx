"use client"

import { useEffect, useRef } from "react"
import { trackGoal } from "@lib/util/plausible"

type Props = {
  orderId: string
  total?: number
  currencyCode?: string
}

/**
 * Fires the Plausible `order_placed` goal exactly once per order id, even if
 * the user refreshes the confirmation page or navigates back.
 */
export default function OrderPlacedTracker({ orderId, total, currencyCode }: Props) {
  const sent = useRef<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (sent.current === orderId) return
    const key = `_hg_order_tracked_${orderId}`
    try {
      if (window.sessionStorage.getItem(key)) {
        sent.current = orderId
        return
      }
      window.sessionStorage.setItem(key, "1")
    } catch {
      // sessionStorage unavailable — best-effort dedupe via ref only
    }
    sent.current = orderId
    trackGoal("order_placed", {
      order_id: orderId,
      ...(typeof total === "number" ? { total } : {}),
      ...(currencyCode ? { currency: currencyCode } : {}),
    })
  }, [orderId, total, currencyCode])

  return null
}
