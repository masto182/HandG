"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"

export default function FilterChips() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const chips: { key: string; value: string; label: string }[] = []

  const breweries = searchParams.get("brewery")
  if (breweries) {
    breweries.split(",").forEach((b) => {
      chips.push({ key: "brewery", value: b, label: b })
    })
  }

  const styles = searchParams.get("style")
  if (styles) {
    styles.split(",").forEach((s) => {
      chips.push({ key: "style", value: s, label: s })
    })
  }

  const freshness = searchParams.get("freshness")
  if (freshness) {
    const labels: Record<string, string> = {
      "0-30": "< 30 days",
      "31-60": "30–60 days",
      "61-90": "60–90 days",
      "91-120": "91–120 days",
      "121+": "121+ days",
    }
    freshness.split(",").forEach((f) => {
      chips.push({ key: "freshness", value: f, label: labels[f] || f })
    })
  }

  const hops = searchParams.get("hops")
  if (hops) {
    hops.split(",").forEach((h) => {
      chips.push({ key: "hops", value: h, label: h })
    })
  }

  if (searchParams.get("collab") === "true") {
    chips.push({ key: "collab", value: "true", label: "Collaborations" })
  }

  if (chips.length === 0) return null

  const removeChip = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (key === "brewery" || key === "style" || key === "freshness" || key === "hops") {
      const current = params.get(key)?.split(",") || []
      const next = current.filter((v) => v !== value)
      if (next.length) {
        params.set(key, next.join(","))
      } else {
        params.delete(key)
        if (key === "hops") params.delete("hopsMode")
      }
    } else {
      params.delete(key)
    }
    params.delete("page")
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const clearAll = () => {
    const params = new URLSearchParams()
    const sort = searchParams.get("sortBy")
    if (sort) params.set("sortBy", sort)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-8">
      <span className="font-semibold text-[11px] text-hg-text-secondary mr-2 uppercase tracking-widest">ACTIVE FILTERS:</span>
      {chips.map((chip) => (
        <div
          key={`${chip.key}-${chip.value}`}
          className="flex items-center gap-2 px-3 py-1.5 bg-hg-surface border border-hg-border rounded-full group"
        >
          <span className="text-[12px] text-hg-text">{chip.label}</span>
          <button
            onClick={() => removeChip(chip.key, chip.value)}
            className="text-hg-text-secondary hover:text-hl-error transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}
      <button onClick={clearAll} className="text-hg-gold font-semibold text-[11px] hover:underline ml-2 transition-all uppercase tracking-widest">
        Clear All
      </button>
    </div>
  )
}
