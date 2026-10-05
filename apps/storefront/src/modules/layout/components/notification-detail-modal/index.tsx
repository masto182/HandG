"use client"

import Modal from "@modules/common/components/modal"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { getNotificationLink } from "@lib/util/notification-link"
import type { NotificationItem } from "@lib/data/notifications"

type NotificationDetailModalProps = {
  notification: NotificationItem | null
  onClose: () => void
}

export default function NotificationDetailModal({
  notification,
  onClose,
}: NotificationDetailModalProps) {
  const link = notification ? getNotificationLink(notification) : null
  const isExternal = link ? /^https?:\/\//.test(link.href) : false
  const date = notification ? new Date(notification.created_at) : null

  return (
    <Modal
      isOpen={!!notification}
      onClose={onClose}
      title={notification?.title}
      category={
        date && !Number.isNaN(date.getTime())
          ? date.toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })
          : undefined
      }
      footer={
        link ? (
          isExternal ? (
            <a
              href={link.href}
              className="text-body-sm text-primary font-medium hover:underline"
            >
              {link.label}
            </a>
          ) : (
            <LocalizedClientLink
              href={link.href}
              onClick={onClose}
              className="text-body-sm text-primary font-medium hover:underline"
            >
              {link.label}
            </LocalizedClientLink>
          )
        ) : undefined
      }
    >
      <p
        data-testid="notification-detail-body"
        className="text-body-md text-on-surface-variant whitespace-pre-wrap break-words"
      >
        {notification?.body}
      </p>
    </Modal>
  )
}
