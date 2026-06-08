"use client"

import { useState } from "react"
import { sdk } from "@lib/config"
import Link from "next/link"

type RestockAlert = {
  id: string
  beer_name: string
  brewery_name: string
}

type BreweryFollow = {
  id: string
  brewery_id: string
  channel_email: boolean
  channel_inapp: boolean
}

type HopAlert = {
  id: string
  hop_id: string
  channel_email: boolean
  channel_inapp: boolean
}

type Brewery = { id: string; name: string; location?: string }
type Hop = {
  id: string
  name: string
  slug: string
  flavor_profile?: string | null
}

function Toggle({
  enabled,
  label,
  onToggle,
}: {
  enabled: boolean
  label: string
  onToggle: (v: boolean) => void
}) {
  return (
    <button
      onClick={() => onToggle(!enabled)}
      aria-label={`${label} ${enabled ? "on" : "off"}`}
      className={`relative inline-flex w-9 h-5 rounded-full transition-colors ${
        enabled ? "bg-hl-primary" : "bg-hg-border"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
          enabled ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  )
}

type AlertsClientProps = {
  initialRestockAlerts: RestockAlert[]
  initialBreweryFollows: BreweryFollow[]
  initialHopAlerts: HopAlert[]
  breweries: Brewery[]
  hops: Hop[]
  initialNewDropsEnabled: boolean
}

export default function AlertsClient({
  initialRestockAlerts,
  initialBreweryFollows,
  initialHopAlerts,
  breweries,
  hops,
  initialNewDropsEnabled,
}: AlertsClientProps) {
  const [restockAlerts, setRestockAlerts] = useState(initialRestockAlerts)
  const [breweryFollows, setBreweryFollows] = useState(initialBreweryFollows)
  const [hopAlerts, setHopAlerts] = useState(initialHopAlerts)
  const [newDropsEnabled, setNewDropsEnabled] = useState(initialNewDropsEnabled)

  const toggleNewDrops = async (next: boolean) => {
    setNewDropsEnabled(next)
    try {
      await sdk.client.fetch("/store/customers/me/notifications/preferences", {
        method: "POST",
        body: { category: "new_drops", enabled: next },
      })
    } catch {
      setNewDropsEnabled(!next)
    }
  }

  const updateBreweryChannel = async (
    breweryId: string,
    field: "channel_email" | "channel_inapp",
    value: boolean,
  ) => {
    setBreweryFollows((prev) =>
      prev.map((b) =>
        b.brewery_id === breweryId ? { ...b, [field]: value } : b,
      ),
    )
    try {
      await sdk.client.fetch("/store/customers/me/brewery-follows", {
        method: "POST",
        body: { brewery_id: breweryId, [field]: value },
      })
    } catch {
      setBreweryFollows((prev) =>
        prev.map((b) =>
          b.brewery_id === breweryId ? { ...b, [field]: !value } : b,
        ),
      )
    }
  }

  const removeBreweryFollow = async (breweryId: string) => {
    setBreweryFollows((prev) => prev.filter((b) => b.brewery_id !== breweryId))
    try {
      await sdk.client.fetch("/store/customers/me/brewery-follows", {
        method: "DELETE",
        body: { brewery_id: breweryId },
      })
    } catch {
      setBreweryFollows((prev) => [...prev])
    }
  }

  const updateHopChannel = async (
    hopId: string,
    field: "channel_email" | "channel_inapp",
    value: boolean,
  ) => {
    setHopAlerts((prev) =>
      prev.map((h) => (h.hop_id === hopId ? { ...h, [field]: value } : h)),
    )
    try {
      await sdk.client.fetch("/store/customers/me/hop-alerts", {
        method: "POST",
        body: { hop_id: hopId, [field]: value },
      })
    } catch {
      setHopAlerts((prev) =>
        prev.map((h) => (h.hop_id === hopId ? { ...h, [field]: !value } : h)),
      )
    }
  }

  const removeHopAlert = async (hopId: string) => {
    setHopAlerts((prev) => prev.filter((h) => h.hop_id !== hopId))
    try {
      await sdk.client.fetch("/store/customers/me/hop-alerts", {
        method: "DELETE",
        body: { hop_id: hopId },
      })
    } catch {
      setHopAlerts((prev) => [...prev])
    }
  }

  const removeRestock = async (id: string) => {
    setRestockAlerts((prev) => prev.filter((a) => a.id !== id))
    try {
      await sdk.client.fetch(`/store/customers/me/restock-alerts/${id}`, {
        method: "DELETE",
      })
    } catch {}
  }

  const breweryName = (breweryId: string) =>
    breweries.find((b) => b.id === breweryId)?.name ?? breweryId
  const hopName = (hopId: string) =>
    hops.find((h) => h.id === hopId)?.name ?? hopId

  return (
    <div className="w-full space-y-6" data-testid="alerts-page-wrapper">
      <div className="mb-2">
        <h1 className="text-h2 text-on-surface">Alerts</h1>
        <p className="text-body-md text-on-surface-variant mt-1">
          Choose what triggers a notification — and how you hear about it.
        </p>
      </div>

      <section className="bg-hg-surface border border-hg-border rounded-xl overflow-hidden">
        <div className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-hg-text">
              Every new release
            </p>
            <p className="text-xs text-hg-text-secondary mt-0.5">
              Get alerted the moment any beer drops.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-hg-text-muted"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <span className="text-xs text-hg-text-muted">Email</span>
              <Toggle
                enabled={newDropsEnabled}
                label="All new releases email"
                onToggle={toggleNewDrops}
              />
            </div>
          </div>
        </div>
        <p className="px-5 pb-4 text-xs text-hg-text-muted/70 border-t border-hg-border/30 pt-2">
          In-app alerts are always enabled for your subscriptions.{" "}
          <Link
            href="/account/email-settings"
            className="underline hover:text-hl-primary"
          >
            Email settings
          </Link>
        </p>
      </section>

      <section className="bg-hg-surface border border-hg-border rounded-xl overflow-hidden">
        <div className="p-5 pb-3 flex items-center justify-between border-b border-hg-border/30">
          <div>
            <p className="text-sm font-semibold text-hg-text">Brewery Alerts</p>
            <p className="text-xs text-hg-text-secondary mt-0.5">
              Get notified when breweries you love drop something new.
            </p>
          </div>
          <span className="text-xs text-hg-text-muted">
            {breweryFollows.length} following
          </span>
        </div>
        {breweryFollows.length === 0 ? (
          <p className="p-5 text-sm text-hg-text-secondary">
            You&apos;re not following any breweries yet.{" "}
            <Link href="/breweries" className="text-hl-primary hover:underline">
              Browse breweries →
            </Link>
          </p>
        ) : (
          <ul className="divide-y divide-hg-border/30">
            {breweryFollows.map((bf) => (
              <li
                key={bf.brewery_id}
                className="px-5 py-3 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-hg-text truncate">
                    {breweryName(bf.brewery_id)}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-hg-text-muted">Email</span>
                    <Toggle
                      enabled={bf.channel_email}
                      label="brewery email"
                      onToggle={(v) =>
                        updateBreweryChannel(bf.brewery_id, "channel_email", v)
                      }
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-hg-text-muted">In-app</span>
                    <Toggle
                      enabled={bf.channel_inapp}
                      label="brewery in-app"
                      onToggle={(v) =>
                        updateBreweryChannel(bf.brewery_id, "channel_inapp", v)
                      }
                    />
                  </div>
                  <button
                    onClick={() => removeBreweryFollow(bf.brewery_id)}
                    className="text-xs text-hg-text-muted hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-hg-surface border border-hg-border rounded-xl overflow-hidden">
        <div className="p-5 pb-3 flex items-center justify-between border-b border-hg-border/30">
          <div>
            <p className="text-sm font-semibold text-hg-text">Hop Alerts</p>
            <p className="text-xs text-hg-text-secondary mt-0.5">
              Be notified of releases with your favourite hops.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-hg-text-muted">
              {hopAlerts.length} following
            </span>
            <Link
              href="/hops"
              className="text-xs text-hl-primary hover:underline font-medium"
            >
              + Add hop
            </Link>
          </div>
        </div>
        {hopAlerts.length === 0 ? (
          <p className="p-5 text-sm text-hg-text-secondary">
            You haven&apos;t set any hop alerts.{" "}
            <Link href="/hops" className="text-hl-primary hover:underline">
              Browse hops →
            </Link>
          </p>
        ) : (
          <ul className="divide-y divide-hg-border/30">
            {hopAlerts.map((ha) => (
              <li
                key={ha.hop_id}
                className="px-5 py-3 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-hg-text truncate">
                    {hopName(ha.hop_id)}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-hg-text-muted">Email</span>
                    <Toggle
                      enabled={ha.channel_email}
                      label="hop email"
                      onToggle={(v) =>
                        updateHopChannel(ha.hop_id, "channel_email", v)
                      }
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-hg-text-muted">In-app</span>
                    <Toggle
                      enabled={ha.channel_inapp}
                      label="hop in-app"
                      onToggle={(v) =>
                        updateHopChannel(ha.hop_id, "channel_inapp", v)
                      }
                    />
                  </div>
                  <button
                    onClick={() => removeHopAlert(ha.hop_id)}
                    className="text-xs text-hg-text-muted hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-hg-surface border border-hg-border rounded-xl overflow-hidden">
        <div className="p-5 pb-3 border-b border-hg-border/30">
          <p className="text-sm font-semibold text-hg-text">Restock Alerts</p>
          <p className="text-xs text-hg-text-secondary mt-0.5">
            Beers you asked to be notified about when back in stock.
          </p>
        </div>
        {restockAlerts.length === 0 ? (
          <p className="p-5 text-sm text-hg-text-secondary">
            No active restock alerts.
          </p>
        ) : (
          <ul className="divide-y divide-hg-border/30">
            {restockAlerts.map((a) => (
              <li
                key={a.id}
                className="px-5 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-hg-text">
                    {a.beer_name}
                  </p>
                  <p className="text-xs text-hg-text-secondary">
                    {a.brewery_name}
                  </p>
                </div>
                <button
                  onClick={() => removeRestock(a.id)}
                  className="text-xs text-hg-text-muted hover:text-red-400 transition-colors px-3 py-1 border border-hg-border rounded-lg"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
