import * as React from "react"
import { Text } from "@react-email/components"
import Layout from "./_components/Layout"
import Heading from "./_components/Heading"
import Button from "./_components/Button"

export type OrderDeliveredProps = {
  name: string
  orderDisplayId: string
  storeUrl: string
}

export const subject = (p: OrderDeliveredProps) => `Your order has arrived · #${p.orderDisplayId}`

export default function OrderDeliveredEmail({
  name = "Alex",
  orderDisplayId = "1234",
  storeUrl = "https://hopsandglory.au",
}: OrderDeliveredProps) {
  return (
    <Layout preview={`Order #${orderDisplayId} has been delivered`} storeUrl={storeUrl}>
      <Heading>Your order has arrived</Heading>
      <Text style={body}>Hi {name},</Text>
      <Text style={body}>
        The carrier has marked order <strong>#{orderDisplayId}</strong> as delivered. Time to chill
        a few and crack one open.
      </Text>
      <Text style={muted}>
        Not there, or something arrived damaged? Just reply to this email and we'll sort it out.
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

const muted = {
  color: "#66706B",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0 0 20px",
}
