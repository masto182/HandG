"use client"

import { useEffect, useState } from "react"
import { sdk } from "@lib/config"

type Announcement = {
  id: string
  message: string
  link_text: string | null
  link_url: string | null
  type: "info" | "warning" | "promo"
  priority: number
}

const DISMISSED_KEY = "hg_dismissed_banners"

function getDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(DISMISSED_KEY) ?? "[]"))
  } catch {
    return new Set()
  }
}

function addDismissed(id: string) {
  try {
    const s = getDismissed()
    s.add(id)
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...s]))
  } catch {}
}

const AnnouncementStrip = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    setDismissedIds(getDismissed())
    sdk.client
      .fetch<{ announcements: Announcement[] }>("/store/announcements", {
        method: "GET",
      })
      .then((data) => setAnnouncements(data.announcements ?? []))
      .catch(() => {})
  }, [])

  const visible = announcements.filter((a) => !dismissedIds.has(a.id))
  const current = visible[0] ?? null

  if (!current) return null

  const dismiss = () => {
    addDismissed(current.id)
    setDismissedIds(getDismissed())
  }

  const bgClass =
    current.type === "promo"
      ? "bg-hg-gold"
      : current.type === "warning"
        ? "bg-hl-warning"
        : "bg-hl-primary-soft"

  const textClass =
    current.type === "promo" || current.type === "warning"
      ? "text-white"
      : "text-hg-text"

  return (
    <div
      className={`relative flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium ${bgClass} ${textClass}`}
    >
      <span>{current.message}</span>
      {current.link_text && current.link_url && (
        <a
          href={current.link_url}
          className="underline underline-offset-2 font-semibold hover:opacity-80"
        >
          {current.link_text}
        </a>
      )}
      <button
        onClick={dismiss}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-3 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss announcement"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M1 1l12 12M13 1L1 13"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  )
}

export default AnnouncementStrip
