import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Badge, Text, Toaster, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { sdk } from "../../../lib/sdk"

type ConfigEntry = {
  key: string
  group: string
  label: string
  type: "string" | "number" | "boolean" | "json"
  effective: unknown
  source: "override" | "env" | "default"
}

type TestService = {
  code: string
  name: string
  price: string
  max_extra_cover?: number
}

type TestResult = {
  ok: boolean
  mode?: "live" | "stub"
  service_count?: number
  services?: TestService[]
  error?: string
  sample?: { fromPostcode: string; toPostcode: string; weightKg: number }
}

const AUSPOST_KEYS = [
  "auspost_enabled",
  "auspost_mode",
  "auspost_api_key",
  "auspost_services_enabled",
  "auspost_discount_pct_standard",
  "auspost_discount_pct_express",
  "auspost_extra_cover_threshold_aud",
  "auspost_sod_trigger_aud",
] as const

const AusPostShippingPage = () => {
  const [config, setConfig] = useState<Record<string, ConfigEntry>>({})
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)

  const loadConfig = async () => {
    const res = await sdk.client.fetch<{ entries: ConfigEntry[] }>("/admin/site-config", {
      method: "GET",
    })
    const map: Record<string, ConfigEntry> = {}
    for (const e of res.entries) map[e.key] = e
    setConfig(map)
  }

  useEffect(() => {
    loadConfig()
  }, [])

  const formatValue = (entry: ConfigEntry | undefined): string => {
    if (!entry) return "-"
    if (entry.key === "auspost_api_key") {
      const v = entry.effective as string
      if (!v) return "(not set - stub mode)"
      return `${v.slice(0, 4)}...${v.slice(-4)} (${entry.source})`
    }
    if (typeof entry.effective === "object") {
      return JSON.stringify(entry.effective)
    }
    return `${String(entry.effective)} (${entry.source})`
  }

  const runTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await sdk.client.fetch<TestResult>("/admin/shipping/auspost/test-connection", {
        method: "POST",
        body: {},
      })
      setTestResult(res)
      if (res.ok) {
        toast.success(`PAC OK (${res.mode}). ${res.service_count} services returned for sample shipment.`)
      } else {
        toast.error(`PAC test failed: ${res.error}`)
      }
    } catch (err) {
      const msg = (err as Error).message
      setTestResult({ ok: false, error: msg })
      toast.error(`Test failed: ${msg}`)
    } finally {
      setTesting(false)
    }
  }

  const enabled = (config.auspost_enabled?.effective as boolean | undefined) ?? false

  return (
    <Container className="divide-y p-0">
      <Toaster />
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Australia Post (PAC)</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            Public PAC API for AU-domestic Parcel Post / Express Post rates. Manual fulfillment via
            MyPost Business portal.
          </Text>
        </div>
        <Badge color={enabled ? "green" : "grey"}>{enabled ? "Enabled" : "Disabled"}</Badge>
      </div>

      <div className="px-6 py-4 space-y-3">
        <Heading level="h2" className="text-base">
          Current configuration
        </Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Edit values via the Site Config admin page. Changes take effect immediately.
        </Text>
        <div className="grid grid-cols-[1fr_2fr] gap-y-2 text-sm">
          {AUSPOST_KEYS.map((k) => (
            <div key={k} className="contents">
              <div className="font-mono text-ui-fg-subtle">{k}</div>
              <div className="font-mono">{formatValue(config[k])}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 py-4 space-y-3">
        <Heading level="h2" className="text-base">
          Test connection
        </Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Hits PAC <code>/service.json</code> with a Hillside (3037) -&gt; Melbourne (3000) 1.5kg
          parcel. In stub mode this returns deterministic AUD rates without hitting AusPost.
        </Text>
        <Button onClick={runTest} disabled={testing} variant="primary">
          {testing ? "Testing..." : "Run test"}
        </Button>

        {testResult && (
          <div className="mt-4 p-4 bg-ui-bg-subtle rounded">
            {testResult.ok ? (
              <>
                <Text size="small">
                  <strong>Mode:</strong> {testResult.mode} - <strong>{testResult.service_count}</strong> services
                </Text>
                <ul className="mt-2 space-y-1 text-sm font-mono">
                  {(testResult.services ?? []).map((s) => (
                    <li key={s.code}>
                      {s.code} - {s.name} - ${s.price}
                      {s.max_extra_cover !== undefined ? ` (cover up to $${s.max_extra_cover})` : ""}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <Text size="small" className="text-ui-fg-error">
                <strong>Error:</strong> {testResult.error}
              </Text>
            )}
          </div>
        )}
      </div>

      <div className="px-6 py-4 space-y-2">
        <Heading level="h2" className="text-base">
          Manual lodgement workflow
        </Heading>
        <Text size="small" className="text-ui-fg-subtle">
          PAC returns retail rates only. There is no public AusPost API for MyPost Business
          contracted rates or labels. After a customer picks AusPost shipping at checkout:
        </Text>
        <ol className="list-decimal pl-5 text-sm space-y-1">
          <li>Click <strong>Fulfill</strong> on the order. The fulfillment is created with a
            <code> manual_lodgement </code> flag and a per-box breakdown.</li>
          <li>Open the MyPost Business portal in a new tab and lodge each parcel using the
            breakdown weights/dims.</li>
          <li>Paste the tracking number(s) into the order's AusPost lodgement card and Save -
            the customer is emailed a tracking link automatically.</li>
        </ol>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Australia Post (PAC)",
})

export default AusPostShippingPage
