"use client"

import { useState } from "react"
import { sdk } from "@lib/config"

type RestockAlertButtonProps = {
  productId: string
  beerName: string
  breweryName: string
  initialAlertId?: string | null
}

type State =
  | { kind: "idle" }
  | { kind: "subscribing" }
  | { kind: "subscribed"; alertId: string }
  | { kind: "unsubscribing"; alertId: string }
  | { kind: "error"; message: string }

export default function RestockAlertButton({
  productId,
  beerName,
  breweryName,
  initialAlertId,
}: RestockAlertButtonProps) {
  const [state, setState] = useState<State>(
    initialAlertId ? { kind: "subscribed", alertId: initialAlertId } : { kind: "idle" }
  )

  const subscribe = async () => {
    setState({ kind: "subscribing" })
    try {
      const res = await sdk.client.fetch<{ restock_alert: { id: string } }>(
        "/store/customers/me/restock-alerts",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: { product_id: productId, beer_name: beerName, brewery_name: breweryName },
        }
      )
      const alertId = res?.restock_alert?.id
      if (!alertId) throw new Error("No alert id in response")
      setState({ kind: "subscribed", alertId })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Subscription failed"
      console.error("[RestockAlert] subscribe failed:", err)
      setState({ kind: "error", message })
    }
  }

  const unsubscribe = async () => {
    if (state.kind !== "subscribed") return
    const { alertId } = state
    setState({ kind: "unsubscribing", alertId })
    try {
      await sdk.client.fetch(`/store/customers/me/restock-alerts/${alertId}`, {
        method: "DELETE",
      })
      setState({ kind: "idle" })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unsubscribe failed"
      console.error("[RestockAlert] unsubscribe failed:", err)
      setState({ kind: "error", message })
    }
  }

  if (state.kind === "subscribed") {
    return (
      <div className="flex items-center gap-3" data-testid="restock-alert-subscribed">
        <span className="flex items-center gap-2 px-4 py-2.5 bg-hl-primary-soft border border-hg-border rounded-xl text-sm text-hg-gold">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Subscribed
        </span>
        <button
          type="button"
          onClick={unsubscribe}
          className="text-xs text-hg-text-secondary hover:text-red-400 underline underline-offset-2"
        >
          Unsubscribe
        </button>
      </div>
    )
  }

  if (state.kind === "unsubscribing") {
    return (
      <div className="px-4 py-2.5 bg-hg-surface border border-hg-border rounded-xl text-sm text-hg-text-secondary">
        Unsubscribing…
      </div>
    )
  }

  if (state.kind === "error") {
    return (
      <div className="flex flex-col gap-2" data-testid="restock-alert-error">
        <button
          type="button"
          onClick={subscribe}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-hg-gold text-white text-sm font-medium hover:bg-hg-gold-hover transition-colors"
        >
          Try again
        </button>
        <p className="text-xs text-red-400">{state.message}</p>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={subscribe}
      disabled={state.kind === "subscribing"}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-hg-gold text-white text-sm font-medium hover:bg-hg-gold-hover transition-colors disabled:opacity-50"
      data-testid="restock-alert-idle"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {state.kind === "subscribing" ? "Subscribing…" : "Notify me when available"}
    </button>
  )
}
