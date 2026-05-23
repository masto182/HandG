import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Button,
  Input,
  Label,
  Textarea,
  Badge,
  Switch,
} from "@medusajs/ui"
import { useEffect, useState } from "react"
import { sdk } from "../../lib/sdk"

type ConfigEntry = {
  key: string
  group: string
  label: string
  description: string
  type: "string" | "number" | "boolean" | "json"
  isPublic: boolean
  envVar: string | null
  default: unknown
  override: unknown | null
  effective: unknown
  source: "override" | "env" | "default"
  updatedAt: string | null
  updatedBy: string | null
}

type HistoryRow = {
  id: string
  key: string
  value_old: unknown
  value_new: unknown
  action: "set" | "unset"
  actor: string | null
  created_at: string
}

const GROUP_ORDER = ["payments", "vip", "email", "branding", "shipping"] as const
const GROUP_LABELS: Record<string, string> = {
  payments: "Payments",
  vip: "VIP",
  email: "Email",
  branding: "Branding",
  shipping: "Shipping",
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—"
  if (typeof v === "object") return JSON.stringify(v)
  return String(v)
}

function ConfigRow({
  entry,
  onChanged,
}: {
  entry: ConfigEntry
  onChanged: (next: ConfigEntry) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<string>(formatValue(entry.effective))
  const [saving, setSaving] = useState(false)
  const [reverting, setReverting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [bool, setBool] = useState<boolean>(Boolean(entry.effective))

  useEffect(() => {
    setDraft(formatValue(entry.effective))
    setBool(Boolean(entry.effective))
  }, [entry.effective])

  const parseDraft = (): unknown => {
    if (entry.type === "boolean") return bool
    if (entry.type === "number") {
      const n = Number(draft)
      if (!Number.isFinite(n)) throw new Error("Must be a number")
      return n
    }
    if (entry.type === "json") {
      try {
        return JSON.parse(draft)
      } catch {
        throw new Error("Must be valid JSON")
      }
    }
    return draft
  }

  const save = async () => {
    setError(null)
    setSaving(true)
    try {
      const value = parseDraft()
      const data = await sdk.client.fetch<{ entry: ConfigEntry }>(
        `/admin/site-config/${entry.key}`,
        { method: "PATCH", body: { value } }
      )
      onChanged(data.entry)
      setEditing(false)
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setSaving(false)
    }
  }

  const revert = async () => {
    setError(null)
    setReverting(true)
    try {
      const data = await sdk.client.fetch<{ entry: ConfigEntry }>(
        `/admin/site-config/${entry.key}`,
        { method: "DELETE" }
      )
      onChanged(data.entry)
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setReverting(false)
    }
  }

  const loadHistory = async () => {
    if (showHistory) {
      setShowHistory(false)
      return
    }
    setShowHistory(true)
    try {
      const data = await sdk.client.fetch<{ history: HistoryRow[] }>(
        `/admin/site-config/${entry.key}/history`
      )
      setHistory(data.history || [])
    } catch {}
  }

  const sourceColor =
    entry.source === "override" ? "green" : entry.source === "env" ? "orange" : "grey"

  return (
    <div className="border border-ui-border-base rounded-lg p-4 mb-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-ui-fg-muted">{entry.key}</span>
            <Badge color={sourceColor as any} size="2xsmall">
              {entry.source}
            </Badge>
            {entry.isPublic && (
              <Badge color="blue" size="2xsmall">
                public
              </Badge>
            )}
          </div>
          <p className="font-medium">{entry.label}</p>
          <p className="text-xs text-ui-fg-muted">{entry.description}</p>
          {entry.envVar && (
            <p className="text-xs text-ui-fg-muted mt-1">
              env fallback: <code>{entry.envVar}</code>
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 items-end">
          {!editing ? (
            <>
              <div className="font-mono text-sm text-right max-w-[280px] truncate">
                {formatValue(entry.effective)}
              </div>
              <div className="flex gap-2">
                <Button size="small" variant="secondary" onClick={() => setEditing(true)}>
                  Edit
                </Button>
                {entry.source === "override" && (
                  <Button
                    size="small"
                    variant="secondary"
                    isLoading={reverting}
                    onClick={revert}
                  >
                    Revert
                  </Button>
                )}
                <Button size="small" variant="transparent" onClick={loadHistory}>
                  {showHistory ? "Hide" : "History"}
                </Button>
              </div>
            </>
          ) : (
            <div className="w-[280px] space-y-2">
              {entry.type === "boolean" ? (
                <div className="flex items-center justify-end gap-2">
                  <Label>{bool ? "On" : "Off"}</Label>
                  <Switch checked={bool} onCheckedChange={setBool} />
                </div>
              ) : entry.type === "json" ? (
                <Textarea
                  rows={4}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
              ) : (
                <Input
                  type={entry.type === "number" ? "number" : "text"}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
              )}
              <div className="flex gap-2 justify-end">
                <Button size="small" variant="secondary" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button size="small" isLoading={saving} onClick={save}>
                  Save
                </Button>
              </div>
              {error && <p className="text-xs text-ui-fg-error">{error}</p>}
            </div>
          )}
        </div>
      </div>
      {showHistory && (
        <div className="mt-3 pt-3 border-t border-ui-border-base">
          {history.length === 0 ? (
            <p className="text-xs text-ui-fg-muted">No history yet.</p>
          ) : (
            <ul className="space-y-1">
              {history.map((h) => (
                <li key={h.id} className="text-xs font-mono">
                  <span className="text-ui-fg-muted">{h.created_at}</span>{" "}
                  <span>{h.action}</span>{" "}
                  {h.actor && <span className="text-ui-fg-muted">by {h.actor}</span>}{" "}
                  <span>old={formatValue(h.value_old)}</span>{" "}
                  <span>new={formatValue(h.value_new)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

const SiteConfigPage = () => {
  const [entries, setEntries] = useState<ConfigEntry[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const data = await sdk.client.fetch<{ entries: ConfigEntry[] }>(
        "/admin/site-config"
      )
      setEntries(data.entries || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const onEntryChanged = (next: ConfigEntry) => {
    setEntries((prev) => prev.map((e) => (e.key === next.key ? next : e)))
  }

  const grouped: Record<string, ConfigEntry[]> = {}
  for (const e of entries) {
    grouped[e.group] = grouped[e.group] || []
    grouped[e.group].push(e)
  }

  return (
    <Container>
      <Heading level="h1" className="mb-2">
        Site Configuration
      </Heading>
      <p className="text-ui-fg-subtle mb-6 text-sm">
        Edit runtime settings for the storefront. Resolution order: DB override &gt; env var &gt; default.
        Public values are visible to all storefront visitors via{" "}
        <code>/store/site-config/public</code>.
      </p>

      {loading ? (
        <p className="text-ui-fg-muted">Loading…</p>
      ) : (
        GROUP_ORDER.map((g) =>
          grouped[g]?.length ? (
            <section key={g} className="mb-8">
              <Heading level="h2" className="mb-3">
                {GROUP_LABELS[g]}
              </Heading>
              {grouped[g].map((entry) => (
                <ConfigRow
                  key={entry.key}
                  entry={entry}
                  onChanged={onEntryChanged}
                />
              ))}
            </section>
          ) : null
        )
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Site Configuration",
})

export default SiteConfigPage
