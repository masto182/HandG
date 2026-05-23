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

export const subject = (p: OrderPaymentCapturedProps) =>
  `Payment received · #${p.orderDisplayId}`

export default function OrderPaymentCapturedEmail({
  name,
  orderDisplayId,
  storeUrl,
}: OrderPaymentCapturedProps) {
  return (
    <Layout
      preview={`Payment received for order #${orderDisplayId}`}
      storeUrl={storeUrl}
    >
      <Heading>Payment Received</Heading>
      <Text>Hi {name},</Text>
      <Text>
        We&apos;ve received your payment for order{" "}
        <strong>#{orderDisplayId}</strong>. We&apos;ll let you know as soon as
        it ships.
      </Text>
      <Button href={`${storeUrl}/account/orders`}>View Order</Button>
    </Layout>
  )
}
