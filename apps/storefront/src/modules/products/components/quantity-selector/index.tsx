"use client"

import { useState } from "react"

export default function QuantitySelector({
  max = 99,
  value = 1,
  onChange,
}: {
  max?: number
  value?: number
  onChange: (qty: number) => void
}) {
  const [qty, setQty] = useState(value)

  const update = (n: number) => {
    const clamped = Math.max(1, Math.min(max, n))
    setQty(clamped)
    onChange(clamped)
  }

  return (
    <div className="flex items-center bg-hl-surface3 rounded-xl border border-hg-border/30 overflow-hidden">
      <button
        type="button"
        onClick={() => update(qty - 1)}
        disabled={qty <= 1}
        className="px-3 h-full py-3 hover:bg-hg-surface-hover transition-colors flex items-center justify-center text-hg-text-muted disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <span className="w-10 text-center font-semibold text-body-md text-hg-text select-none">
        {qty}
      </span>
      <button
        type="button"
        onClick={() => update(qty + 1)}
        disabled={qty >= max}
        className="px-3 h-full py-3 hover:bg-hg-surface-hover transition-colors flex items-center justify-center text-hg-text-muted disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  )
}
