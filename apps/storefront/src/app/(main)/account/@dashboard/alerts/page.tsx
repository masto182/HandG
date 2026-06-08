import { getMyRestockAlerts } from "@lib/data/restock-alerts"
import { getMyBreweryFollows } from "@lib/data/brewery-follows"
import { getMyHopAlerts } from "@lib/data/hop-alerts"
import { listBreweries } from "@lib/data/breweries"
import { listHops } from "@lib/data/hops"
import { getNotificationPreferences } from "@lib/data/notification-prefs"
import AlertsClient from "./alerts-client"

export default async function AlertsPage() {
  const [restockAlerts, breweryFollows, hopAlerts, breweries, hops, prefs] =
    await Promise.all([
      getMyRestockAlerts(),
      getMyBreweryFollows(),
      getMyHopAlerts(),
      listBreweries(),
      listHops(),
      getNotificationPreferences(),
    ])

  const newDropsEnabled =
    prefs.find((p) => p.category === "new_drops")?.enabled ?? false

  return (
    <AlertsClient
      initialRestockAlerts={restockAlerts}
      initialBreweryFollows={breweryFollows}
      initialHopAlerts={hopAlerts}
      breweries={breweries}
      hops={hops}
      initialNewDropsEnabled={newDropsEnabled}
    />
  )
}
