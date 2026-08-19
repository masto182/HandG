"use client"

import { useEffect, useState, useRef } from "react"
import { toast } from "sonner"
import Icon from "@modules/common/components/icon"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { getNotificationLink } from "@lib/util/notification-link"
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationItem,
} from "@lib/data/notifications"

import { filterNewAlertNotifications } from "@lib/util/notification-toast"

const SEEN_KEY = "hg_shown_notifs"

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [markingAll, setMarkingAll] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const shownRef = useRef<Set<string>>(new Set())

  const fetchNotifications = async () => {
    try {
      const data = await getMyNotifications({ limit: 50 })
      const items = data.notifications || []
      setNotifications(items)
      setUnreadCount(data.unread_count || 0)

      const fresh = filterNewAlertNotifications(items, shownRef.current)
      for (const n of fresh) {
        toast(n.title, { description: n.body })
        shownRef.current.add(n.id)
      }
      if (fresh.length) {
        try {
          sessionStorage.setItem(
            SEEN_KEY,
            JSON.stringify(Array.from(shownRef.current)),
          )
        } catch {}
      }
    } catch {}
  }

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SEEN_KEY)
      if (stored) {
        JSON.parse(stored).forEach((id: string) => shownRef.current.add(id))
      }
    } catch {}
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const handleOpen = () => {
    const next = !open
    setOpen(next)
    if (next) {
      // Refetch on every open so what's shown is never more than a click away
      // from current, rather than waiting on the 60s poll.
      fetchNotifications()
    }
  }

  const handleItemClick = async (n: NotificationItem) => {
    if (n.read) return
    setNotifications((prev) =>
      prev.map((item) => (item.id === n.id ? { ...item, read: true } : item)),
    )
    setUnreadCount((prev) => Math.max(prev - 1, 0))
    try {
      await markNotificationRead(n.id)
    } catch {
      // Revert on failure so the UI doesn't lie about persisted state.
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === n.id ? { ...item, read: false } : item,
        ),
      )
      setUnreadCount((prev) => prev + 1)
    }
  }

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || markingAll) return
    setMarkingAll(true)
    const previous = notifications
    const previousCount = unreadCount
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
    try {
      await markAllNotificationsRead()
    } catch {
      setNotifications(previous)
      setUnreadCount(previousCount)
    } finally {
      setMarkingAll(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative text-on-surface-variant hover:text-primary transition-colors"
      >
        <Icon name="notifications" size={22} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-on-primary text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-[340px] bg-surface-container-high rounded-xl border border-outline-variant shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-outline-variant flex items-center justify-between gap-2">
            <h3 className="text-body-md font-semibold text-on-surface">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="text-label-caps text-primary hover:underline disabled:opacity-50"
              >
                {markingAll ? "Marking..." : "Mark all read"}
              </button>
            )}
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Icon
                  name="notifications_none"
                  size={32}
                  className="text-on-surface-variant/40 mx-auto mb-2"
                />
                <p className="text-body-sm text-on-surface-variant">
                  No notifications yet
                </p>
              </div>
            ) : (
              notifications.slice(0, 10).map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  role={n.read ? undefined : "button"}
                  className={[
                    "px-4 py-3 border-b border-outline-variant/50 last:border-b-0 hover:bg-surface-container transition-colors cursor-pointer",
                    n.read ? "" : "bg-primary/5",
                  ].join(" ")}
                >
                  <div className="flex gap-3">
                    <span className="relative flex-shrink-0 mt-0.5">
                      <Icon
                        name={n.read ? "drafts" : "mail"}
                        size={18}
                        className={
                          n.read ? "text-on-surface-variant" : "text-primary"
                        }
                      />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className={[
                          "text-body-sm truncate",
                          n.read
                            ? "font-medium text-on-surface-variant"
                            : "font-semibold text-on-surface",
                        ].join(" ")}
                      >
                        {n.title}
                      </p>
                      <p className="text-body-sm text-on-surface-variant line-clamp-2">
                        {n.body}
                      </p>
                      {(() => {
                        const link = getNotificationLink(n)
                        if (!link) return null
                        const isExternal = /^https?:\/\//.test(link.href)
                        return isExternal ? (
                          <a
                            href={link.href}
                            onClick={(e) => e.stopPropagation()}
                            className="text-body-sm text-primary font-medium hover:underline"
                          >
                            {link.label}
                          </a>
                        ) : (
                          <LocalizedClientLink
                            href={link.href}
                            className="text-body-sm text-primary font-medium hover:underline"
                          >
                            {link.label}
                          </LocalizedClientLink>
                        )
                      })()}
                      <p className="text-[11px] text-on-surface-variant/60 mt-1">
                        {new Date(n.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-outline-variant px-4 py-3">
            <LocalizedClientLink
              href="/account/notifications"
              className="text-body-sm font-medium text-primary hover:underline"
            >
              See all
            </LocalizedClientLink>
          </div>
        </div>
      )}
    </div>
  )
}
