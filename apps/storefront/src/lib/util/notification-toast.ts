type NotificationItem = {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  created_at: string
}

export const ALERT_TOAST_TYPES = new Set(["new_drop", "restock"])

export function filterNewAlertNotifications(
  notifications: NotificationItem[],
  seenIds: Set<string>,
): NotificationItem[] {
  return notifications.filter(
    (n) => !n.read && ALERT_TOAST_TYPES.has(n.type) && !seenIds.has(n.id),
  )
}
