"use client"
import { useEffect, useState } from "react"

function formatTimeLeft(ms: number): string | null {
  if (ms <= 0) return null
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 24) return null
  if (hours === 0 && minutes <= 0) return null
  if (hours === 0) return `${minutes}m left`
  return `${hours}h ${minutes}m left`
}

export default function SpecialCountdown({
  endsAt,
  variant = "pill",
}: {
  endsAt: string | null
  variant?: "pill" | "banner"
}) {
  const [timeLeft, setTimeLeft] = useState<string | null>(null)

  useEffect(() => {
    if (!endsAt) return

    const update = () => {
      const ms = new Date(endsAt).getTime() - Date.now()
      setTimeLeft(formatTimeLeft(ms))
    }

    update()
    const interval = setInterval(update, 60_000)
    return () => clearInterval(interval)
  }, [endsAt])

  if (!timeLeft) return null

  if (variant === "banner") {
    return (
      <div className="w-full px-4 py-3 mb-4 border-l-4 border-amber-500 bg-amber-900/10 rounded-r-lg">
        <p className="text-sm font-medium text-amber-200">
          Ends in {timeLeft}
        </p>
      </div>
    )
  }

  return (
    <span className="absolute top-10 left-3 z-10 px-2 py-0.5 rounded text-[9px] font-mono font-medium bg-amber-900/80 text-amber-200 shadow-sm">
      {timeLeft}
    </span>
  )
}
