import React from "react"
import type { ActiveSpecial } from "@lib/data/specials"

type PillType =
  | "EARLY ACCESS"
  | "ANNIVERSARY"
  | "COLLAB"
  | "NEW"
  | "SPECIAL"
  | "VIP DEAL"

type PillConfig = {
  label: string
  className: string
}

const PILL_STYLES: Record<PillType, PillConfig> = {
  "EARLY ACCESS": {
    label: "Early Access",
    className: "bg-pill-early-access-bg text-pill-early-access-text",
  },
  ANNIVERSARY: {
    label: "Anniversary",
    className: "bg-pill-anniversary-bg text-pill-anniversary-text",
  },
  COLLAB: {
    label: "Collab",
    className: "bg-pill-collab-bg text-pill-collab-text",
  },
  NEW: {
    label: "New",
    className: "bg-pill-new-bg text-pill-new-text",
  },
  SPECIAL: {
    label: "Special",
    className: "bg-pill-special-bg text-pill-special-text",
  },
  "VIP DEAL": {
    label: "VIP Deal",
    className: "bg-pill-vip-deal-bg text-pill-vip-deal-text",
  },
}

const NEW_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000

function parseReleasedDate(raw: string | undefined | null): Date | null {
  if (!raw) return null
  const parsed = new Date(raw)
  if (!isNaN(parsed.getTime())) return parsed
  const match = raw.match(/(\d{1,2})-(\w+)-(\d{4})/)
  if (match) {
    const d = new Date(`${match[2]} ${match[1]}, ${match[3]}`)
    if (!isNaN(d.getTime())) return d
  }
  return null
}

export function determinePillTypes(
  product: {
    id?: string
    metadata?: any
    created_at?: string | null
    tags?: Array<{ id?: string; value?: string }> | null
    breweries?: Array<{ slug?: string }> | null
  },
  customerVipTier?: string | null,
  activeSpecial?: ActiveSpecial | null,
): PillType[] {
  const meta = product.metadata as any
  const tagValues = (product.tags || [])
    .map((t) => t.value?.toLowerCase())
    .filter(Boolean)

  if (customerVipTier && meta?.released_date) {
    const releaseDate = parseReleasedDate(meta.released_date)
    if (releaseDate) {
      const now = Date.now()
      const releaseMs = releaseDate.getTime()
      if (releaseMs > now) {
        const offsets = { vip1: 0, vip2: 6, vip3: 12, vip4: 24, vip5: 48 }
        const tierKey = customerVipTier as keyof typeof offsets
        const offsetHours = offsets[tierKey] ?? 0
        const windowStart = releaseMs - offsetHours * 60 * 60 * 1000
        if (now >= windowStart) {
          return ["EARLY ACCESS"]
        }
      }
    }
  }

  if (activeSpecial) {
    return [activeSpecial.type === "vip_exclusive" ? "VIP DEAL" : "SPECIAL"]
  }

  const pills: PillType[] = []

  if (tagValues.includes("anniversary")) pills.push("ANNIVERSARY")

  if (Array.isArray(product.breweries) && product.breweries.length > 1) {
    pills.push("COLLAB")
  }

  if (pills.length === 0 && product.created_at) {
    const age = Date.now() - new Date(product.created_at).getTime()
    if (age < NEW_THRESHOLD_MS && age >= 0) pills.push("NEW")
  }

  return pills
}

export default function ProductPill({
  product,
  customerVipTier,
  activeSpecial,
}: {
  product: {
    id?: string
    metadata?: any
    created_at?: string | null
    tags?: Array<{ id?: string; value?: string }> | null
    breweries?: Array<{ slug?: string }> | null
  }
  customerVipTier?: string | null
  activeSpecial?: ActiveSpecial | null
}) {
  const types = determinePillTypes(product, customerVipTier, activeSpecial)
  if (types.length === 0) return null

  return (
    <div
      data-testid="product-pill"
      className="absolute top-3 left-3 z-10 flex flex-col gap-1"
    >
      {types.map((type) => (
        <span
          key={type}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm ${PILL_STYLES[type].className}`}
        >
          {PILL_STYLES[type].label}
        </span>
      ))}
    </div>
  )
}
