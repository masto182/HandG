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

type Order = {
  id: string
  shipping_methods?: ShippingMethod[]
}

const OrderShippingDetailWidget = ({ data }: { data: Order }) => {
  const orderId = data?.id
  const [methods, setMethods] = useState<ShippingMethod[]>([])

  useEffect(() => {
    if (!orderId) return
    sdk.client
      .fetch<{ order: Order }>(
        `/admin/orders/${orderId}?fields=shipping_methods.id,shipping_methods.name,shipping_methods.amount,shipping_methods.data`,
        { method: "GET" }
      )
      .then((res) => setMethods(res.order?.shipping_methods ?? []))
      .catch(() => {})
  }, [orderId])

  if (!methods.length) return null

  const sm = methods[0]
  const d = sm.data ?? {}
  const carrier = (d.carrier_display_name as string) || null
  const service = (d.service_display_name as string) || null
  const sod = d.force_sod === true || d.sod_requested === true
  const label = [carrier, service].filter(Boolean).join(" — ") || sm.name || "Shipping"

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-x-2">
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
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details",
})

export default OrderShippingDetailWidget
