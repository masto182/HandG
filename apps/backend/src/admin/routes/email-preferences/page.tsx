import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Input,
  Label,
  Switch,
  Button,
  Badge,
} from "@medusajs/ui"
import { useState } from "react"
import { sdk } from "../../lib/sdk"

type Preference = {
  category: string
  label: string
  description: string
  transactional: boolean
  enabled: boolean
}

type Customer = {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
}

const EmailPreferencesPage = () => {
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<Customer[]>([])
  const [selected, setSelected] = useState<Customer | null>(null)
  const [prefs, setPrefs] = useState<Preference[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchCustomers = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await sdk.client.fetch<{ customers: Customer[] }>(
        `/admin/customers?q=${encodeURIComponent(search)}&limit=20`,
        { method: "GET" }
      )
      setResults(res.customers || [])
    } catch (e: any) {
      setError(e?.message || "Search failed")
    } finally {
      setLoading(false)
    }
  }

  const loadPrefs = async (c: Customer) => {
    setSelected(c)
    setPrefs(null)
    setLoading(true)
    setError(null)
    try {
      const res = await sdk.client.fetch<{ preferences: Preference[] }>(
        `/admin/customers/${c.id}/notifications/preferences`,
        { method: "GET" }
      )
      setPrefs(res.preferences || [])
    } catch (e: any) {
      setError(e?.message || "Could not load preferences")
    } finally {
      setLoading(false)
    }
  }

  const togglePref = async (pref: Preference) => {
    if (!selected) return
    setLoading(true)
    setError(null)
    try {
      const res = await sdk.client.fetch<{
        updated: boolean
        preferences: Preference[]
      }>(`/admin/customers/${selected.id}/notifications/preferences`, {
        method: "PATCH",
        body: { category: pref.category, enabled: !pref.enabled } as any,
      })
      setPrefs(res.preferences)
    } catch (e: any) {
      setError(e?.message || "Update failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container className="p-6 max-w-3xl space-y-6">
      <div>
        <Heading level="h1">Customer Email Preferences</Heading>
        <p className="text-sm text-ui-fg-subtle mt-1">
          Search for a customer to view and override their email
          notification preferences. Admin updates bypass the
          transactional-required rule.
        </p>
      </div>

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Label>Customer email or name</Label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="search@example.com"
            onKeyDown={(e) => e.key === "Enter" && searchCustomers()}
          />
        </div>
        <Button onClick={searchCustomers} disabled={loading || !search.trim()}>
          Search
        </Button>
      </div>

      {results.length > 0 && (
        <div className="border border-ui-border-base rounded-lg divide-y">
          {results.map((c) => (
            <button
              key={c.id}
              onClick={() => loadPrefs(c)}
              className="block w-full text-left p-3 hover:bg-ui-bg-base-hover"
            >
              <div className="text-sm font-medium">{c.email}</div>
              {(c.first_name || c.last_name) && (
                <div className="text-xs text-ui-fg-subtle">
                  {[c.first_name, c.last_name].filter(Boolean).join(" ")}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {selected && prefs && (
        <div className="space-y-3">
          <Heading level="h2">{selected.email}</Heading>
          {prefs.map((p) => (
            <div
              key={p.category}
              className="flex items-start justify-between gap-4 p-4 border border-ui-border-base rounded-lg"
            >
              <div className="flex-1">
                <div className="text-sm font-medium flex gap-2 items-center">
                  {p.label}
                  {p.transactional && <Badge size="2xsmall">Transactional</Badge>}
                </div>
                <div className="text-xs text-ui-fg-subtle mt-0.5">
                  {p.description}
                </div>
              </div>
              <Switch
                checked={p.enabled}
                disabled={loading}
                onCheckedChange={() => togglePref(p)}
              />
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-ui-fg-error" role="alert">
          {error}
        </p>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Email Preferences",
  icon: undefined,
})

export default EmailPreferencesPage
