"use client"

import { useState, useTransition } from "react"
import { subscribeHopAlert, unsubscribeHopAlert } from "@lib/data/hop-alerts"

type AlertHopButtonProps = {
  hopId: string
  initialAlerted: boolean
  variant?: "pill" | "full"
}

export default function AlertHopButton({
  hopId,
  initialAlerted,
  variant = "pill",
}: AlertHopButtonProps) {
  const [alerted, setAlerted] = useState(initialAlerted)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState(false)

  const handleClick = () => {
    setError(false)
    const next = !alerted
    setAlerted(next)
    startTransition(async () => {
      const ok = next
        ? await subscribeHopAlert(hopId)
        : await unsubscribeHopAlert(hopId)
      if (!ok) {
        setAlerted(!next)
        setError(true)
      }
    })
  }

  if (variant === "full") {
    return (
      <div>
        <button
          onClick={handleClick}
          disabled={isPending}
          aria-label={alerted ? "Disable hop alerts" : "Enable hop alerts"}
          className={`flex items-center gap-2 px-8 py-3 font-bold rounded-xl active:scale-95 transition-all ${
            alerted
              ? "bg-hl-primary/20 border border-hl-primary text-hl-primary"
              : "bg-hl-primary text-white"
          }`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill={alerted ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {alerted ? "Alerts on" : "Alert me of new drops"}
        </button>
        {error && (
          <p className="text-xs text-red-400 mt-1">Failed — try again.</p>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      aria-label={alerted ? "Disable hop alerts" : "Enable hop alerts"}
      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all active:scale-95 border ${
        alerted
          ? "border-hl-primary/50 text-hl-primary"
          : "border-hg-border text-hg-text-secondary hover:border-hl-primary hover:text-hl-primary"
      }`}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill={alerted ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {alerted ? "Alerts on" : "Alert me"}
    </button>
  )
}
