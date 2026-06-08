import * as React from "react"
import { Link, Section, Text } from "@react-email/components"
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

export const subject = (p: OrderShippedProps) => `Your order has shipped · #${p.orderDisplayId}`

export default function OrderShippedEmail({
  name = "Alex",
  orderDisplayId = "1234",
  carrier = "Australia Post",
  trackingNumber = "1Z999AA1012345678",
  trackingUrl,
  storeUrl = "https://hopsandglory.au",
}: OrderShippedProps) {
  return (
    <Layout preview={`Order #${orderDisplayId} is on its way to you`} storeUrl={storeUrl}>
      <Heading>Your order is on its way</Heading>
      <Text style={body}>Hi {name},</Text>
      <Text style={body}>
        Order <strong>#{orderDisplayId}</strong> has been dispatched and is on its way to you.
        {carrier ? ` Shipped via ${carrier}.` : ""}
      </Text>

      {trackingNumber ? (
        <Section style={trackingBox}>
          <Text style={trackingLabel}>Tracking</Text>
          <Text style={trackingNumber_}>{trackingNumber}</Text>
          {trackingUrl ? (
            <Link href={trackingUrl} style={trackingLink}>
              Track your shipment →
            </Link>
          ) : null}
        </Section>
      ) : null}

      <Text style={muted}>Delivery typically takes 2–5 business days from dispatch.</Text>

      <Button href={trackingUrl || `${storeUrl}/account/orders`}>
        {trackingUrl ? "Track Shipment" : "View Order"}
      </Button>
    </Layout>
  )
}

const body = {
  color: "#1E2421",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 16px",
}

const trackingBox = {
  backgroundColor: "#F0F6F3",
  border: "1px solid #3F7C62",
  borderRadius: "6px",
  margin: "0 0 20px",
  padding: "16px 20px",
}

const trackingLabel = {
  color: "#3F7C62",
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.08em",
  margin: "0 0 6px",
  textTransform: "uppercase" as const,
}

const trackingNumber_ = {
  color: "#1E2421",
  fontFamily: "monospace",
  fontSize: "17px",
  fontWeight: 700,
  letterSpacing: "0.04em",
  margin: "0 0 10px",
}

const trackingLink = {
  color: "#3F7C62",
  fontSize: "14px",
  fontWeight: 500,
  textDecoration: "none",
}

const muted = {
  color: "#66706B",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0 0 8px",
}
