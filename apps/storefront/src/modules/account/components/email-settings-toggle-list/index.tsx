"use client"

import * as React from "react"
import { sdk } from "@lib/config"

export type PreferenceEntry = {
  category: string
  label: string
  description: string
  transactional: boolean
  enabled: boolean
}

type PatchResult =
  | { updated: true; entry: PreferenceEntry }
  | { updated: false; noticeMessage: string }

export default function EmailSettingsToggleList({
  initial,
}: {
  initial: PreferenceEntry[]
}) {
  const [prefs, setPrefs] = React.useState<PreferenceEntry[]>(initial)
  const [busy, setBusy] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const onToggle = async (entry: PreferenceEntry) => {
    if (entry.transactional) {
      setNotice(
        "This category is required for account & order notifications and cannot be disabled."
      )
      return
    }
    setBusy(entry.category)
    setError(null)
    setNotice(null)
    try {
      const result = await sdk.client.fetch<PatchResult>(
        "/store/customers/me/notifications/preferences",
        {
          method: "PATCH",
          body: { category: entry.category, enabled: !entry.enabled } as any,
        }
      )
      if (result.updated) {
        setPrefs((cur) =>
          cur.map((p) =>
            p.category === entry.category
              ? { ...p, enabled: result.entry.enabled }
              : p
          )
        )
      } else {
        setNotice(result.noticeMessage)
      }
    } catch (e: any) {
      setError(e?.message || "Could not update preference")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-3">
      {prefs.map((p) => {
        const isBusy = busy === p.category
        const disabled = p.transactional || isBusy
        return (
          <div
            key={p.category}
            data-testid={`email-pref-${p.category}`}
            className="flex items-start justify-between gap-4 p-4 border border-neutral-200 rounded-lg"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{p.label}</div>
              <div className="text-xs text-neutral-500 mt-0.5">
                {p.description}
              </div>
              {p.transactional ? (
                <div className="text-xs text-neutral-400 mt-1">
                  Required — cannot be disabled.
                </div>
              ) : null}
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={p.enabled}
              aria-label={`Toggle ${p.label}`}
              disabled={disabled}
              onClick={() => onToggle(p)}
              className={[
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition",
                p.enabled ? "bg-hg-gold" : "bg-neutral-300",
                disabled ? "opacity-50 cursor-not-allowed" : "",
              ].join(" ")}
            >
              <span
                className={[
                  "inline-block h-5 w-5 rounded-full bg-white transition",
                  p.enabled ? "translate-x-5" : "translate-x-0",
                ].join(" ")}
              />
            </button>
          </div>
        )
      })}
      {notice ? (
        <p className="text-xs text-neutral-500" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
