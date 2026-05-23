import * as React from "react"
import { Text } from "@react-email/components"
import Layout from "./_components/Layout"
import Heading from "./_components/Heading"
import Button from "./_components/Button"

export type OrderShippedProps = {
  name: string
  orderDisplayId: string
  carrier?: string
  trackingNumber?: string
  trackingUrl?: string
  storeUrl: string
}

export const subject = (p: OrderShippedProps) =>
  `Your order has shipped · #${p.orderDisplayId}`

export default function OrderShippedEmail({
  name,
  orderDisplayId,
  carrier,
  trackingNumber,
  trackingUrl,
  storeUrl,
}: OrderShippedProps) {
  return (
    <Layout
      preview={`Order #${orderDisplayId} is on its way`}
      storeUrl={storeUrl}
    >
      <Heading>On Its Way</Heading>
      <Text>Hi {name},</Text>
      <Text>
        Your order <strong>#{orderDisplayId}</strong> has shipped.
        {carrier ? ` Carried by ${carrier}.` : ""}
      </Text>
      {trackingNumber ? (
        <Text>
          Tracking: <strong>{trackingNumber}</strong>
        </Text>
      ) : null}
      <Button href={trackingUrl || `${storeUrl}/account/orders`}>
        {trackingUrl ? "Track Shipment" : "View Order"}
      </Button>
    </Layout>
  )
}
