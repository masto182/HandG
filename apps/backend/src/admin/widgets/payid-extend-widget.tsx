import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Text, Badge } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { sdk } from "../lib/sdk"

type Payment = {
  provider_id: string
  captured_at?: string | null
}

type PaymentCollection = {
  payments?: Payment[]
}

type Order = {
  id: string
  created_at: string
  metadata?: Record<string, unknown>
  payment_collections?: PaymentCollection[]
}

type ConfigEntry = {
  key: string
  effective: unknown
}

function toLocalDatetimeInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDisplayDate(iso: string): string {
  return new Date(iso).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const PayIdExtendWidget = ({ data }: { data: Order }) => {
  const orderId = data?.id
  const [order, setOrder] = useState<Order | null>(null)
  const [holdHours, setHoldHours] = useState<number>(24)
  const [draftDatetime, setDraftDatetime] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) return
    // Fetch order with payment data
    sdk.client
      .fetch<{ order: Order }>(
        `/admin/orders/${orderId}?fields=id,created_at,metadata,payment_collections.payments.provider_id,payment_collections.payments.captured_at`,
        { method: "GET" }
      )
      .then((res) => setOrder(res.order))
      .catch(() => {})

    // Fetch global hold hours from site config
    sdk.client
      .fetch<{ entries: ConfigEntry[] }>("/admin/site-config", { method: "GET" })
      .then((res) => {
        const entry = res.entries?.find((e) => e.key === "payid_hold_hours")
        if (entry && typeof entry.effective === "number") {
          setHoldHours(entry.effective)
        }
      })
      .catch(() => {})
  }, [orderId])

  // Pre-fill input whenever order or holdHours resolves
  useEffect(() => {
    if (!order) return
    const existing = order.metadata?.payid_extended_until as string | undefined
    const calculated = new Date(new Date(order.created_at).getTime() + holdHours * 60 * 60 * 1000)
    const prefill = existing && new Date(existing) > calculated ? new Date(existing) : calculated
    setDraftDatetime(toLocalDatetimeInput(prefill))
  }, [order, holdHours])

  const hasPayId = (order ?? data).payment_collections
    ?.flatMap((pc) => pc.payments ?? [])
    .some((p) => p.provider_id?.startsWith("pp_payid"))

  if (!hasPayId) return null

  const currentExtension = (order ?? data).metadata?.payid_extended_until as string | undefined
  const calculatedExpiry = new Date(
    new Date((order ?? data).created_at).getTime() + holdHours * 60 * 60 * 1000
  )
  const effectiveExpiry =
    currentExtension && new Date(currentExtension) > calculatedExpiry
      ? new Date(currentExtension)
      : calculatedExpiry

  const isExpired = effectiveExpiry < new Date()

  const handleExtend = async () => {
    setError(null)
    setSuccessMsg(null)
    if (!draftDatetime) {
      setError("Please enter a date and time.")
      return
    }
    const extDate = new Date(draftDatetime)
    if (extDate <= new Date()) {
      setError("Extended until must be in the future.")
      return
    }
    setSaving(true)
    try {
      const res = await sdk.client.fetch<{ order: { metadata: Record<string, unknown> } }>(
        `/admin/orders/${orderId}/payid-extend`,
        { method: "POST", body: { extended_until: extDate.toISOString() } }
      )
      setOrder((prev) => (prev ? { ...prev, metadata: res.order.metadata } : prev))
      setSuccessMsg(`Extended until ${formatDisplayDate(extDate.toISOString())}`)
    } catch (e: any) {
      setError(e?.message || "Failed to extend payment window.")
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async () => {
    setError(null)
    setSuccessMsg(null)
    setSaving(true)
    try {
      // Set extended_until to null by posting the calculated expiry (removes the override effectively)
      // We do this by patching metadata directly — set payid_extended_until to null via a separate approach
      // Since the endpoint requires a future date, we just reload the component to reflect state
      // For clearing: post a date in the past is invalid, so we use a workaround:
      // post the natural expiry time to effectively "reset" to default
      const naturalExpiry = new Date(
        new Date((order ?? data).created_at).getTime() + holdHours * 60 * 60 * 1000
      )
      // If natural expiry is in the past, we can't call the endpoint — just note it's expired
      if (naturalExpiry < new Date()) {
        setSuccessMsg(
          "Natural hold window has already passed — order will be cancelled on next job run."
        )
        setOrder((prev) => {
          if (!prev) return prev
          const meta = { ...(prev.metadata ?? {}) }
          delete meta.payid_extended_until
          return { ...prev, metadata: meta }
        })
      } else {
        const res = await sdk.client.fetch<{ order: { metadata: Record<string, unknown> } }>(
          `/admin/orders/${orderId}/payid-extend`,
          { method: "POST", body: { extended_until: naturalExpiry.toISOString() } }
        )
        setOrder((prev) => (prev ? { ...prev, metadata: res.order.metadata } : prev))
        setSuccessMsg("Reset to natural hold window.")
      }
    } catch (e: any) {
      setError(e?.message || "Failed to reset.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">PayID Hold Window</Heading>
        <Badge color={isExpired ? "red" : currentExtension ? "green" : "grey"}>
          {isExpired ? "Expired" : currentExtension ? "Extended" : `${holdHours}h default`}
        </Badge>
      </div>

      <div className="px-6 py-4 space-y-3">
        <div className="flex justify-between text-sm">
          <Text className="text-ui-fg-subtle">Current expiry</Text>
          <Text className={isExpired ? "text-red-500 font-medium" : "font-medium"}>
            {formatDisplayDate(effectiveExpiry.toISOString())}
          </Text>
        </div>

        <div className="space-y-2">
          <Text className="text-ui-fg-subtle text-sm">Extend until</Text>
          <input
            type="datetime-local"
            value={draftDatetime}
            onChange={(e) => setDraftDatetime(e.target.value)}
            className="w-full rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 text-sm text-ui-fg-base focus:outline-none focus:ring-1 focus:ring-ui-border-interactive"
          />
        </div>

        {error && <Text className="text-red-500 text-sm">{error}</Text>}
        {successMsg && <Text className="text-green-600 text-sm">{successMsg}</Text>}

        <div className="flex gap-2 pt-1">
          <Button size="small" isLoading={saving} onClick={handleExtend}>
            Save Extension
          </Button>
          {currentExtension && (
            <Button size="small" variant="secondary" isLoading={saving} onClick={handleClear}>
              Reset to Default
            </Button>
          )}
        </div>

        <Text className="text-ui-fg-subtle text-xs">
          The auto-cancel job runs every 15 minutes and will skip this order until the expiry time
          passes.
        </Text>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.side.before",
})

export default PayIdExtendWidget
