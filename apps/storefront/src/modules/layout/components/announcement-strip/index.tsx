"use client"

import { useEffect, useState } from "react"
import { sdk } from "@lib/config"

type Announcement = {
  id: string
  message: string
  link_text: string | null
  link_url: string | null
  type: "info" | "warning" | "promo"
}

const AnnouncementStrip = () => {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const data = await sdk.client.fetch<{ announcements: any[] }>(
          "/store/announcements",
          { method: "GET" }
        )
        if (data.announcements?.length > 0) {
          const latest = data.announcements[0]
          const dismissedId = sessionStorage.getItem("dismissed-announcement")
          if (dismissedId !== latest.id) {
            setAnnouncement(latest)
          }
        }
      } catch {
        // silently fail
      }
    }
    fetchAnnouncements()
  }, [])

  if (!announcement || dismissed) return null

  const dismiss = () => {
    setDismissed(true)
    sessionStorage.setItem("dismissed-announcement", announcement.id)
  }

  const bgClass =
    announcement.type === "promo"
      ? "bg-hg-gold"
      : announcement.type === "warning"
        ? "bg-hl-warning"
        : "bg-hl-primary-soft"

  const textClass =
    announcement.type === "promo"
      ? "text-white"
      : announcement.type === "warning"
        ? "text-white"
        : "text-hg-text"

  return (
    <div
      className={`relative flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium ${bgClass} ${textClass}`}
    >
      <span>{announcement.message}</span>
      {announcement.link_text && announcement.link_url && (
        <a
          href={announcement.link_url}
          className="underline underline-offset-2 font-semibold hover:opacity-80"
        >
          {announcement.link_text}
        </a>
      )}
      <button
        onClick={dismiss}
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity"
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
