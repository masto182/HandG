import * as React from "react"
import { Text } from "@react-email/components"
import Layout from "./_components/Layout"
import Heading from "./_components/Heading"
import Button from "./_components/Button"

export type OrderPaymentCapturedProps = {
  name: string
  orderDisplayId: string
  storeUrl: string
}

export const subject = (p: OrderPaymentCapturedProps) => `Payment confirmed · #${p.orderDisplayId}`

export default function OrderPaymentCapturedEmail({
  name = "Alex",
  orderDisplayId = "1234",
  storeUrl = "https://hopsandglory.au",
}: OrderPaymentCapturedProps) {
  return (
    <Layout
      preview={`Payment received for order #${orderDisplayId} — your order is being prepared`}
      storeUrl={storeUrl}
    >
      <Heading>Payment confirmed</Heading>
      <Text style={body}>Hi {name},</Text>
      <Text style={body}>
        We&apos;ve received your payment for order <strong>#{orderDisplayId}</strong>. Your order is
        now being prepared.
      </Text>
      <Text style={muted}>We&apos;ll send a shipping notification once it&apos;s on its way.</Text>
      <Button href={`${storeUrl}/account/orders`}>View Order</Button>
    </Layout>
  )
}

const body = {
  color: "#1E2421",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 16px",
}

const muted = {
  color: "#66706B",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0 0 8px",
}
