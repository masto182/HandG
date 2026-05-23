import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Input, Text, Badge, Toaster, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { sdk } from "../lib/sdk"

type Fulfillment = {
  id: string
  shipped_at?: string | null
  data?: Record<string, unknown>
  labels?: Array<{ tracking_number?: string; tracking_url?: string }>
}

type Order = {
  id: string
  fulfillments?: Fulfillment[]
}

type BoxBreakdown = {
  index: number
  weight_g: number
  length_cm: number
  width_cm: number
  height_cm: number
}

/**
 * Admin widget on order.details: surface manual_lodgement (auspost)
 * fulfillments with the per-box breakdown and a tracking-number paste form.
 */
const OrderAusPostLodgementWidget = ({ data }: { data: Order }) => {
  const orderId = data?.id
  const [fulfillments, setFulfillments] = useState<Fulfillment[]>([])
  const [trackingDrafts, setTrackingDrafts] = useState<Record<string, string[]>>({})
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) return
    sdk.client
      .fetch<{ order: Order }>(
        `/admin/orders/${orderId}?fields=fulfillments.id,fulfillments.shipped_at,fulfillments.data,fulfillments.labels.*`,
        { method: "GET" },
      )
      .then((res) => {
        const fs = (res.order?.fulfillments ?? []).filter(
          (f) => (f.data ?? {})["manual_lodgement"] === true,
        )
        setFulfillments(fs)
        const drafts: Record<string, string[]> = {}
        for (const f of fs) {
          const breakdown = ((f.data ?? {})["per_box_breakdown"] as BoxBreakdown[] | undefined) ?? []
          drafts[f.id] = breakdown.map(() => "")
        }
        setTrackingDrafts(drafts)
      })
      .catch(() => {
        /* swallow - widget keeps quiet on error */
      })
  }, [orderId])

  if (!fulfillments.length) return null

  const updateDraft = (fid: string, idx: number, value: string) => {
    setTrackingDrafts((prev) => {
      const arr = [...(prev[fid] ?? [])]
      arr[idx] = value
      return { ...prev, [fid]: arr }
    })
  }

  const saveTracking = async (fid: string) => {
    const tracking = (trackingDrafts[fid] ?? []).map((s) => s.trim()).filter(Boolean)
    if (!tracking.length) {
      toast.error("Enter at least one tracking number")
      return
    }
    setSaving(fid)
    try {
      await sdk.client.fetch(`/admin/orders/${orderId}/auspost/tracking`, {
        method: "POST",
        body: {
          fulfillment_id: fid,
          tracking_numbers: tracking,
        },
      })
      toast.success(`Tracking saved (${tracking.length} parcel${tracking.length > 1 ? "s" : ""}). Customer notified.`)
      // Refresh
      const res = await sdk.client.fetch<{ order: Order }>(
        `/admin/orders/${orderId}?fields=fulfillments.id,fulfillments.shipped_at,fulfillments.data,fulfillments.labels.*`,
        { method: "GET" },
      )
      setFulfillments((res.order?.fulfillments ?? []).filter((f) => (f.data ?? {})["manual_lodgement"] === true))
    } catch (err) {
      toast.error(`Save failed: ${(err as Error).message}`)
    } finally {
      setSaving(null)
    }
  }

  return (
    <Container className="divide-y p-0">
      <Toaster />
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <Heading level="h2">Australia Post manual lodgement</Heading>
          <Badge color="orange">manual</Badge>
        </div>
        <Text size="small" className="text-ui-fg-subtle mt-1">
          Lodge each parcel via the MyPost Business portal, then paste the tracking number(s) below
          and Save.
        </Text>
        <a
          href="https://business.auspost.com.au/"
          target="_blank"
          rel="noreferrer"
          className="text-ui-fg-interactive text-sm underline mt-2 inline-block"
        >
          Open MyPost Business
        </a>
      </div>

      {fulfillments.map((f) => {
        const breakdown = ((f.data ?? {})["per_box_breakdown"] as BoxBreakdown[] | undefined) ?? []
        const serviceName = (f.data ?? {})["service_name"] as string | undefined
        const lodgedAt = (f.data ?? {})["lodged_at"] as string | undefined
        const drafts = trackingDrafts[f.id] ?? breakdown.map(() => "")
        const existingTracking = ((f.data ?? {})["tracking_numbers"] as string[] | undefined) ?? []
        const alreadyLodged = existingTracking.length > 0

        return (
          <div key={f.id} className="px-6 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Text size="small">
                  <strong>{serviceName ?? "Australia Post"}</strong> - fulfillment{" "}
                  <code className="text-xs">{f.id.slice(0, 12)}...</code>
                </Text>
                {lodgedAt && (
                  <Text size="xsmall" className="text-ui-fg-subtle mt-1">
                    Lodged {new Date(lodgedAt).toLocaleString()}
                  </Text>
                )}
              </div>
              <Badge color={alreadyLodged ? "green" : "grey"}>
                {alreadyLodged ? "Lodged" : "Awaiting lodgement"}
              </Badge>
            </div>

            <div className="space-y-2">
              {breakdown.map((box, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 bg-ui-bg-subtle rounded p-3 text-sm"
                >
                  <div className="w-32 text-ui-fg-subtle font-mono">
                    Parcel {idx + 1}
                  </div>
                  <div className="w-48 text-ui-fg-subtle font-mono">
                    {(box.weight_g / 1000).toFixed(2)}kg, {box.length_cm}x{box.width_cm}x{box.height_cm}cm
                  </div>
                  <div className="flex-1">
                    <Input
                      placeholder={existingTracking[idx] ?? "Tracking number from MyPost"}
                      value={drafts[idx] ?? ""}
                      onChange={(e) => updateDraft(f.id, idx, e.target.value)}
                      disabled={alreadyLodged}
                    />
                  </div>
                </div>
              ))}
            </div>

            {!alreadyLodged && (
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  onClick={() => saveTracking(f.id)}
                  disabled={saving === f.id}
                >
                  {saving === f.id ? "Saving..." : "Save tracking & notify customer"}
                </Button>
              </div>
            )}

            {alreadyLodged && existingTracking.length > 0 && (
              <div className="text-xs space-y-1">
                {existingTracking.map((n, i) => (
                  <div key={i} className="font-mono">
                    Parcel {i + 1}:{" "}
                    <a
                      href={`https://auspost.com.au/mypost/track/details/${encodeURIComponent(n)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-ui-fg-interactive underline"
                    >
                      {n}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.after",
})

export default OrderAusPostLodgementWidget
