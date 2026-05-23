import * as React from "react"
import { Text } from "@react-email/components"
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

export const subject = (p: OrderReadyForPickupProps) =>
  `Ready for pickup · #${p.orderDisplayId}`

export default function OrderReadyForPickupEmail({
  name,
  orderDisplayId,
  locationName,
  locationAddress,
  locationHours,
  storeUrl,
}: OrderReadyForPickupProps) {
  return (
    <Layout
      preview={`Order #${orderDisplayId} is ready to collect`}
      storeUrl={storeUrl}
    >
      <Heading>Ready to Collect</Heading>
      <Text>Hi {name},</Text>
      <Text>
        Your order <strong>#{orderDisplayId}</strong> is ready for pickup at{" "}
        <strong>{locationName}</strong>.
      </Text>
      <Text style={{ color: "#444", fontSize: "14px" }}>
        {locationAddress}
        {locationHours ? (
          <>
            <br />
            {locationHours}
          </>
        ) : null}
      </Text>
      <Text>
        Please bring photo ID matching the name on the order.
      </Text>
      <Button href={`${storeUrl}/account/orders`}>View Order</Button>
    </Layout>
  )
}
