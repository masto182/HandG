import React from "react"
import type { ActiveSpecial } from "@lib/data/specials"

type PillType = "EARLY ACCESS" | "ANNIVERSARY" | "COLLAB" | "NEW" | "SPECIAL" | "VIP DEAL"

type PillConfig = {
  label: string
  className: string
}

const PILL_STYLES: Record<PillType, PillConfig> = {
  "EARLY ACCESS": { label: "Early Access", className: "bg-violet-600 text-white" },
  "ANNIVERSARY": { label: "Anniversary", className: "bg-pink-600 text-white" },
  "COLLAB": { label: "Collab", className: "bg-hg-gold text-hg-on-primary" },
  "NEW": { label: "New", className: "bg-emerald-600 text-white" },
  "SPECIAL": { label: "Special", className: "bg-red-600 text-white" },
  "VIP DEAL": { label: "VIP Deal", className: "bg-purple-600 text-white" },
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

export function determinePillType(
  product: { id?: string; metadata?: any; created_at?: string | null; tags?: Array<{ id?: string; value?: string }> | null },
  customerVipTier?: string | null,
  activeSpecial?: ActiveSpecial | null
): PillType | null {
  const meta = product.metadata as any
  const tagValues = (product.tags || []).map((t) => t.value?.toLowerCase()).filter(Boolean)

  if (customerVipTier && meta?.released_date) {
    const releaseDate = parseReleasedDate(meta.released_date)
    if (releaseDate) {
      const now = Date.now()
      const releaseMs = releaseDate.getTime()
      if (releaseMs > now) {
        const tierKey = customerVipTier as keyof typeof offsets
        const offsets = { vip1: 0, vip2: 6, vip3: 12, vip4: 24, vip5: 48 }
        const offsetHours = offsets[tierKey] ?? 0
        const windowStart = releaseMs - offsetHours * 60 * 60 * 1000
        if (now >= windowStart) {
          return "EARLY ACCESS"
        }
      }
    }
  }

  if (activeSpecial) {
    if (activeSpecial.type === "vip_exclusive") return "VIP DEAL"
    return "SPECIAL"
  }

  if (tagValues.includes("anniversary")) return "ANNIVERSARY"

  if (meta?.is_collab === true || meta?.is_collab === "true") {
    return "COLLAB"
  }

  if (product.created_at) {
    const age = Date.now() - new Date(product.created_at).getTime()
    if (age < NEW_THRESHOLD_MS && age >= 0) return "NEW"
  }

  return null
}

export default function ProductPill({
  product,
  customerVipTier,
  activeSpecial,
}: {
  product: { id?: string; metadata?: any; created_at?: string | null; tags?: Array<{ id?: string; value?: string }> | null }
  customerVipTier?: string | null
  activeSpecial?: ActiveSpecial | null
}) {
  const type = determinePillType(product, customerVipTier, activeSpecial)
  if (!type) return null

  const config = PILL_STYLES[type]
  return (
    <span
      data-testid="product-pill"
      className={`absolute top-3 left-3 z-10 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm ${config.className}`}
    >
      {config.label}
    </span>
  )
}
