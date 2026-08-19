"use client"

import { useState } from "react"

import {
  deleteNotification,
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
  type NotificationsPage,
} from "@lib/data/notifications"
import Icon from "@modules/common/components/icon"

type Filter = "all" | "unread"

type NotificationsClientProps = {
  initialData: NotificationsPage
}

const PAGE_SIZE = 20

function formatNotificationTimestamp(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ""
  }

  const diffMs = date.getTime() - Date.now()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const week = 7 * day
  const month = 30 * day
  const year = 365 * day
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })

  if (Math.abs(diffMs) < hour) {
    return rtf.format(Math.round(diffMs / minute), "minute")
  }

  if (Math.abs(diffMs) < day) {
    return rtf.format(Math.round(diffMs / hour), "hour")
  }

  if (Math.abs(diffMs) < week) {
    return rtf.format(Math.round(diffMs / day), "day")
  }

  if (Math.abs(diffMs) < month) {
    return rtf.format(Math.round(diffMs / week), "week")
  }

  if (Math.abs(diffMs) < year) {
    return rtf.format(Math.round(diffMs / month), "month")
  }

  return rtf.format(Math.round(diffMs / year), "year")
}

export default function NotificationsClient({
  initialData,
}: NotificationsClientProps) {
  const [notifications, setNotifications] = useState(initialData.notifications)
  const [count, setCount] = useState(initialData.count)
  const [unreadCount, setUnreadCount] = useState(initialData.unread_count)
  const [offset, setOffset] = useState(initialData.notifications.length)
  const [filter, setFilter] = useState<Filter>("all")
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadNotifications = async (
    nextFilter: Filter,
    nextOffset: number,
    append = false,
  ) => {
    const data = await getMyNotifications({
      limit: PAGE_SIZE,
      offset: nextOffset,
      unread: nextFilter === "unread",
    })

    setNotifications((current) => {
      if (!append) {
        return data.notifications
      }

      const seen = new Set(current.map((item) => item.id))
      return [
        ...current,
        ...data.notifications.filter((item) => !seen.has(item.id)),
      ]
    })
    setCount(data.count)
    setUnreadCount(data.unread_count)
    setOffset(nextOffset + data.notifications.length)
  }

  const handleFilterChange = async (nextFilter: Filter) => {
    if (nextFilter === filter || isLoading) {
      return
    }

    setFilter(nextFilter)
    setIsLoading(true)
    setError(null)

    try {
      await loadNotifications(nextFilter, 0)
    } catch (e: any) {
      setError(e?.message || "Could not load notifications")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoadMore = async () => {
    if (isLoadingMore) {
      return
    }

    setIsLoadingMore(true)
    setError(null)

    try {
      await loadNotifications(filter, offset, true)
    } catch (e: any) {
      setError(e?.message || "Could not load more notifications")
    } finally {
      setIsLoadingMore(false)
    }
  }

  const handleMarkRead = async (item: NotificationItem) => {
    if (item.read || busyId === item.id) {
      return
    }

    const previousNotifications = notifications
    const previousUnreadCount = unreadCount
    const previousCount = count
    const previousOffset = offset

    setBusyId(item.id)
    setError(null)

    if (filter === "unread") {
      setNotifications((current) =>
        current.filter((entry) => entry.id !== item.id),
      )
      setCount((current) => Math.max(current - 1, 0))
      setOffset((current) => Math.max(current - 1, 0))
    } else {
      setNotifications((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, read: true } : entry,
        ),
      )
    }

    setUnreadCount((current) => Math.max(current - 1, 0))

    try {
      await markNotificationRead(item.id)
    } catch (e: any) {
      setNotifications(previousNotifications)
      setUnreadCount(previousUnreadCount)
      setCount(previousCount)
      setOffset(previousOffset)
      setError(e?.message || "Could not mark notification as read")
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (item: NotificationItem) => {
    if (busyId === item.id) {
      return
    }

    const previousNotifications = notifications
    const previousUnreadCount = unreadCount
    const previousCount = count
    const previousOffset = offset

    setBusyId(item.id)
    setError(null)
    setNotifications((current) =>
      current.filter((entry) => entry.id !== item.id),
    )
    setCount((current) => Math.max(current - 1, 0))
    setOffset((current) => Math.max(current - 1, 0))

    if (!item.read) {
      setUnreadCount((current) => Math.max(current - 1, 0))
    }

    try {
      await deleteNotification(item.id)
    } catch (e: any) {
      setNotifications(previousNotifications)
      setUnreadCount(previousUnreadCount)
      setCount(previousCount)
      setOffset(previousOffset)
      setError(e?.message || "Could not dismiss notification")
    } finally {
      setBusyId(null)
    }
  }

  const handleMarkAllRead = async () => {
    const previousNotifications = notifications
    const previousUnreadCount = unreadCount
    const previousCount = count
    const previousOffset = offset

    setIsMarkingAllRead(true)
    setError(null)

    if (filter === "unread") {
      setNotifications([])
      setCount(0)
      setOffset(0)
    } else {
      setNotifications((current) =>
        current.map((item) => ({ ...item, read: true })),
      )
    }

    setUnreadCount(0)

    try {
      await markAllNotificationsRead()
    } catch (e: any) {
      setNotifications(previousNotifications)
      setUnreadCount(previousUnreadCount)
      setCount(previousCount)
      setOffset(previousOffset)
      setError(e?.message || "Could not mark all notifications as read")
    } finally {
      setIsMarkingAllRead(false)
    }
  }

  const emptyMessage =
    filter === "unread" ? "You're all caught up" : "No notifications yet"

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-hg-border bg-hg-surface p-5 small:flex-row small:items-center small:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleFilterChange("all")}
            aria-pressed={filter === "all"}
            className={[
              "rounded-lg border px-3 py-1.5 text-sm transition-colors",
              filter === "all"
                ? "border-hl-primary bg-hl-primary text-white"
                : "border-hg-border text-hg-text-secondary hover:text-hg-text",
            ].join(" ")}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => void handleFilterChange("unread")}
            aria-pressed={filter === "unread"}
            className={[
              "rounded-lg border px-3 py-1.5 text-sm transition-colors",
              filter === "unread"
                ? "border-hl-primary bg-hl-primary text-white"
                : "border-hg-border text-hg-text-secondary hover:text-hg-text",
            ].join(" ")}
          >
            <span className="inline-flex items-center gap-2">
              <span>Unread</span>
              <span className="rounded-full bg-black/10 px-2 py-0.5 text-xs text-current">
                {unreadCount}
              </span>
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => void handleMarkAllRead()}
          disabled={unreadCount === 0 || isMarkingAllRead}
          className="rounded-lg border border-hg-border px-3 py-1.5 text-sm text-hg-text-secondary transition-colors hover:text-hg-text disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isMarkingAllRead ? "Marking..." : "Mark all read"}
        </button>
      </div>

      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-hg-border bg-hg-surface">
        {isLoading ? (
          <div className="px-5 py-10 text-sm text-hg-text-secondary">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-5 py-10 text-sm text-hg-text-secondary">
            {emptyMessage}
          </div>
        ) : (
          <ul className="divide-y divide-hg-border/30">
            {notifications.map((item) => {
              const isBusy = busyId === item.id

              return (
                <li key={item.id}>
                  <div
                    onClick={() => void handleMarkRead(item)}
                    onKeyDown={(event) => {
                      if (
                        (event.key === "Enter" || event.key === " ") &&
                        !item.read
                      ) {
                        event.preventDefault()
                        void handleMarkRead(item)
                      }
                    }}
                    role={item.read ? undefined : "button"}
                    tabIndex={item.read ? -1 : 0}
                    className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-surface-container"
                  >
                    <span
                      className={
                        item.read
                          ? "pt-0.5 text-hg-text-secondary"
                          : "pt-0.5 text-primary"
                      }
                    >
                      <Icon name={item.read ? "drafts" : "mail"} size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={[
                          "truncate text-sm",
                          item.read
                            ? "font-medium text-hg-text"
                            : "font-semibold text-hg-text",
                        ].join(" ")}
                      >
                        {item.title}
                      </p>
                      <p className="mt-1 text-sm text-hg-text-secondary line-clamp-2">
                        {item.body}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <p className="text-xs text-hg-text-muted">
                          {formatNotificationTimestamp(item.created_at)}
                        </p>
                        {item.metadata?.link_url ? (
                          <a
                            href={item.metadata.link_url}
                            onClick={(event) => event.stopPropagation()}
                            className="text-xs font-medium text-hl-primary hover:underline"
                          >
                            {item.metadata.link_text || "Learn more"}
                          </a>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        void handleDelete(item)
                      }}
                      aria-label="Dismiss notification"
                      disabled={isBusy}
                      className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-full text-hg-text-muted transition-colors hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Icon name="close" size={18} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {notifications.length < count ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => void handleLoadMore()}
            disabled={isLoadingMore}
            className="rounded-lg border border-hg-border px-4 py-2 text-sm text-hg-text-secondary transition-colors hover:text-hg-text disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoadingMore ? "Loading..." : "Load more"}
          </button>
        </div>
      ) : null}
    </div>
  )
}
