"use client"

import { useEffect, useState } from "react"
import { sdk } from "@lib/config"

type Alert = {
  id: string
  beer_name: string
  brewery_name: string
  product_id: string | null
  created_at: string
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const data = await sdk.client.fetch<{ restock_alerts: Alert[] }>(
          "/store/customers/me/restock-alerts",
          { method: "GET" }
        )
        setAlerts(data.restock_alerts || [])
      } catch {}
      setLoading(false)
    }
    fetchAlerts()
  }, [])

  const removeAlert = async (id: string) => {
    try {
      await sdk.client.fetch(`/store/customers/me/restock-alerts/${id}`, { method: "DELETE" })
      setAlerts(alerts.filter((a) => a.id !== id))
    } catch {}
  }

  if (loading) {
    return <div className="animate-pulse h-48 bg-hg-surface rounded-xl" />
  }

  return (
    <div className="w-full" data-testid="alerts-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-2">
        <h1 className="text-h2 text-on-surface">Restock Alerts</h1>
        <p className="text-body-md text-on-surface-variant mt-1">Get notified when your favourites are back in stock.</p>
      </div>

      {alerts.length === 0 ? (
        <div className="p-8 bg-hg-surface border border-hg-border rounded-xl text-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 text-hg-text-secondary/30">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <p className="text-hg-text-secondary text-sm">No active restock alerts.</p>
          <a href="/store" className="inline-block mt-3 text-sm text-hg-gold hover:text-hg-gold-hover">
            Browse collection →
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-center justify-between p-4 bg-hg-surface border border-hg-border rounded-xl"
            >
              <div>
                <p className="text-sm font-medium text-hg-text">{alert.beer_name}</p>
                <p className="text-xs text-hg-text-secondary">{alert.brewery_name}</p>
              </div>
              <button
                onClick={() => removeAlert(alert.id)}
                className="text-xs text-hg-text-secondary hover:text-red-400 transition-colors px-3 py-1 border border-hg-border rounded-xl"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
