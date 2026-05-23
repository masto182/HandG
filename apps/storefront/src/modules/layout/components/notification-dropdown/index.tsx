"use client"

import { useEffect, useState, useRef } from "react"
import { sdk } from "@lib/config"
import Icon from "@modules/common/components/icon"

type NotificationItem = {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  created_at: string
}

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const fetchNotifications = async () => {
    try {
      const data = await sdk.client.fetch<{ notifications: NotificationItem[] }>(
        "/store/customers/me/notifications",
        { method: "GET" }
      )
      setNotifications(data.notifications || [])
      setUnreadCount((data.notifications || []).filter((n) => !n.read).length)
    } catch {}
  }

  useEffect(() => {
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

  const handleOpen = async () => {
    setOpen(!open)
    if (!open && unreadCount > 0) {
      try {
        await sdk.client.fetch("/store/customers/me/notifications/read-all", {
          method: "POST",
        })
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
        setUnreadCount(0)
      } catch {}
    }
  }

  const typeIcons: Record<string, string> = {
    wishlist_match: "favorite",
    restock: "inventory",
    vip_tier: "military_tech",
    order_status: "local_shipping",
    referral: "group",
    new_drop: "new_releases",
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
          <div className="px-4 py-3 border-b border-outline-variant flex items-center justify-between">
            <h3 className="text-body-md font-semibold text-on-surface">Notifications</h3>
            {notifications.length > 0 && (
              <span className="text-label-caps text-on-surface-variant">{notifications.length}</span>
            )}
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Icon name="notifications_none" size={32} className="text-on-surface-variant/40 mx-auto mb-2" />
                <p className="text-body-sm text-on-surface-variant">No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 10).map((n) => (
                <div
                  key={n.id}
                  className="px-4 py-3 border-b border-outline-variant/50 last:border-b-0 hover:bg-surface-container transition-colors"
                >
                  <div className="flex gap-3">
                    <Icon
                      name={typeIcons[n.type] || "notifications"}
                      size={18}
                      className="text-primary flex-shrink-0 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-body-sm font-medium text-on-surface truncate">{n.title}</p>
                      <p className="text-body-sm text-on-surface-variant line-clamp-2">{n.body}</p>
                      <p className="text-[11px] text-on-surface-variant/60 mt-1">
                        {new Date(n.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
