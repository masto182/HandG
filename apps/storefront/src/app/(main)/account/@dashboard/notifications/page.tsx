import { Metadata } from "next"

import { getMyNotifications } from "@lib/data/notifications"
import NotificationsClient from "./notifications-client"

export const metadata: Metadata = {
  title: "Notifications",
  description: "Stay on top of updates tied to your account.",
}

export default async function NotificationsPage() {
  const data = await getMyNotifications({ limit: 20, offset: 0 })

  return (
    <div className="w-full" data-testid="notifications-page-wrapper">
      <header className="mb-10">
        <h1 className="text-h2 small:text-h1 text-on-surface mb-2">
          Notifications
        </h1>
        <p className="text-body-lg text-on-surface-variant">
          Track account updates, drops, and anything else worth a look.
        </p>
      </header>
      <NotificationsClient initialData={data} />
    </div>
  )
}
