import * as React from "react"
import { Section, Text } from "@react-email/components"
import Layout from "./_components/Layout"
import Heading from "./_components/Heading"
import Button from "./_components/Button"

export type OrderReadyForPickupProps = {
  name: string
  orderDisplayId: string
  locationName: string
  locationAddress: string
  locationHours?: string
  storeUrl: string
}

export const subject = (p: OrderReadyForPickupProps) => `Ready to collect · #${p.orderDisplayId}`

export default function OrderReadyForPickupEmail({
  name = "Alex",
  orderDisplayId = "1234",
  locationName = "Hops & Glory Fitzroy",
  locationAddress = "282 Brunswick St, Fitzroy VIC 3065",
  locationHours = "Mon-Sat 10am-6pm",
  storeUrl = "https://hopsandglory.au",
}: OrderReadyForPickupProps) {
  return (
    <Layout
      preview={`Order #${orderDisplayId} is ready to collect at ${locationName}`}
      storeUrl={storeUrl}
    >
      <Heading>Ready to collect</Heading>
      <Text style={body}>Hi {name},</Text>
      <Text style={body}>
        Your order <strong>#{orderDisplayId}</strong> is ready for collection.
      </Text>

      <Section style={locationBox}>
        <Text style={locationLabel}>Collection point</Text>
        <Text style={locationName_}>{locationName}</Text>
        <Text style={locationAddress_}>{locationAddress}</Text>
        {locationHours ? <Text style={locationHours_}>{locationHours}</Text> : null}
      </Section>

      <Text style={idNote}>
        Please bring <strong>photo ID</strong> matching the name on your order.
      </Text>

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

const locationBox = {
  border: "1px solid #D9E0DA",
  borderRadius: "6px",
  margin: "0 0 20px",
  padding: "16px 20px",
}

const locationLabel = {
  color: "#3F7C62",
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.08em",
  margin: "0 0 6px",
  textTransform: "uppercase" as const,
}

const locationName_ = {
  color: "#1E2421",
  fontSize: "15px",
  fontWeight: 600,
  lineHeight: "1.4",
  margin: "0 0 4px",
}

const locationAddress_ = {
  color: "#1E2421",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0 0 4px",
}

const locationHours_ = {
  color: "#66706B",
  fontSize: "13px",
  lineHeight: "1.5",
  margin: 0,
}

const idNote = {
  color: "#66706B",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0 0 8px",
}
