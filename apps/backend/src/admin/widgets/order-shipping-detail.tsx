import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Badge, Text } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { sdk } from "../lib/sdk"

type ShippingMethod = {
  id: string
  name?: string
  amount?: number
  data?: Record<string, unknown>
}

type Fulfillment = {
  id: string
  canceled_at?: string | null
  data?: Record<string, unknown> | null
}

type Order = {
  id: string
  shipping_methods?: ShippingMethod[]
  fulfillments?: Fulfillment[]
  shipping_address?: { metadata?: Record<string, unknown> | null } | null
}

const OrderShippingDetailWidget = ({ data }: { data: Order }) => {
  const orderId = data?.id
  const [methods, setMethods] = useState<ShippingMethod[]>([])
  const [courierNote, setCourierNote] = useState<string | null>(null)
  const [fulfillments, setFulfillments] = useState<Fulfillment[]>([])

  useEffect(() => {
    if (!orderId) return
    sdk.client
      .fetch<{ order: Order }>(
        `/admin/orders/${orderId}?fields=shipping_methods.id,shipping_methods.name,shipping_methods.amount,shipping_methods.data,shipping_address.metadata,fulfillments.id,fulfillments.canceled_at,fulfillments.data`,
        { method: "GET" }
      )
      .then((res) => {
        setMethods(res.order?.shipping_methods ?? [])
        setFulfillments(res.order?.fulfillments ?? [])
        const note = res.order?.shipping_address?.metadata?.courier_note
        setCourierNote(typeof note === "string" && note.trim() ? note.trim() : null)
      })
      .catch(() => {})
  }, [orderId])

  if (!methods.length) return null

  const sm = methods[0]
  const d = sm.data ?? {}
  const carrier = (d.carrier_display_name as string) || null
  const service = (d.service_display_name as string) || null
  const sod = d.force_sod === true || d.sod_requested === true
  const label = [carrier, service].filter(Boolean).join(" — ") || sm.name || "Shipping"
  const overrides = fulfillments.filter((f) => !f.canceled_at && f.data?.admin_override === true)

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-x-2">
          <Text size="small" className="text-ui-fg-subtle">
            Customer chose
          </Text>
          <Text size="small" weight="plus" className="text-ui-fg-base">
            {label}
          </Text>
          {sod && (
            <Badge color="orange" size="2xsmall">
              Signature on Delivery
            </Badge>
          )}
        </div>
      </div>
      {overrides.map((f) => (
        <div key={f.id} className="flex items-center gap-x-2 px-6 py-4">
          <Text size="small" className="text-ui-fg-subtle">
            Label bought
          </Text>
          <Text size="small" weight="plus" className="text-ui-fg-base">
            {String(f.data?.bought_service_code ?? f.data?.service_code ?? "unknown")}
          </Text>
          <Badge color="blue" size="2xsmall">
            Admin override
          </Badge>
        </div>
      ))}
      {courierNote && (
        <div className="px-6 py-4">
          <Text size="small" weight="plus" className="text-ui-fg-subtle">
            Note for courier
          </Text>
          <Text size="small" className="text-ui-fg-base">
            {courierNote}
          </Text>
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details",
})

export default OrderShippingDetailWidget
