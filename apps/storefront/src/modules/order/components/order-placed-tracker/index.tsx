"use client"

import { useEffect, useRef } from "react"
import { useTrack } from "@lib/hooks/use-track"
import { trackGoal } from "@lib/util/plausible"

type Props = {
  orderId: string
  total?: number
  currencyCode?: string
  cartId?: string | null
}

/**
 * Fires the confirmation-page analytics exactly once per order id, even if the
 * user refreshes the confirmation page or navigates back.
 */
export default function OrderPlacedTracker({
  orderId,
  total,
  currencyCode,
  cartId,
}: Props) {
  const sent = useRef<string | null>(null)
  const track = useTrack()

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
    track("order.confirmation_viewed", {
      order_id: orderId,
      ...(cartId ? { cart_id: cartId } : {}),
      ...(typeof total === "number" ? { total } : {}),
      ...(currencyCode ? { currency_code: currencyCode } : {}),
    })
  }, [cartId, currencyCode, orderId, total, track])

  return null
}
