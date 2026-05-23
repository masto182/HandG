import * as React from "react"
import { Hr, Row, Column, Text } from "@react-email/components"
import Layout from "./_components/Layout"
import Heading from "./_components/Heading"
import Button from "./_components/Button"

export type OrderPlacedItem = {
  title: string
  quantity: number
  unit_price: number
}

export type OrderPlacedProps = {
  name: string
  orderDisplayId: string
  items: OrderPlacedItem[]
  total: number
  currencyCode: string
  isPickup: boolean
  payidAlias?: string
  storeUrl: string
}

export const subject = (p: OrderPlacedProps) =>
  `Order confirmed · #${p.orderDisplayId}`

const fmt = (n: number, ccy: string) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: ccy.toUpperCase(),
  }).format(n / 100)

export default function OrderPlacedEmail({
  name,
  orderDisplayId,
  items,
  total,
  currencyCode,
  isPickup,
  payidAlias,
  storeUrl,
}: OrderPlacedProps) {
  return (
    <Layout
      preview={`Your order #${orderDisplayId} is confirmed`}
      storeUrl={storeUrl}
    >
      <Heading>Order Confirmed</Heading>
      <Text>Hi {name},</Text>
      <Text>
        Thanks for your order. Reference{" "}
        <strong>#{orderDisplayId}</strong>.
      </Text>
      <Hr style={{ borderColor: "#eeeeee", margin: "16px 0" }} />
      {items.map((it, i) => (
        <Row key={i} style={{ marginBottom: "8px" }}>
          <Column>
            <Text style={{ margin: 0, fontSize: "14px" }}>
              {it.quantity} × {it.title}
            </Text>
          </Column>
          <Column align="right">
            <Text style={{ margin: 0, fontSize: "14px" }}>
              {fmt(it.unit_price * it.quantity, currencyCode)}
            </Text>
          </Column>
        </Row>
      ))}
      <Hr style={{ borderColor: "#eeeeee", margin: "16px 0" }} />
      <Row>
        <Column>
          <Text style={{ margin: 0, fontWeight: 600 }}>Total</Text>
        </Column>
        <Column align="right">
          <Text style={{ margin: 0, fontWeight: 600 }}>
            {fmt(total, currencyCode)}
          </Text>
        </Column>
      </Row>
      {!isPickup && payidAlias ? (
        <>
          <Hr style={{ borderColor: "#eeeeee", margin: "16px 0" }} />
          <Text>
            Pay via PayID to{" "}
            <strong style={{ color: "#D4A843" }}>{payidAlias}</strong> with
            reference <strong>{orderDisplayId}</strong>.
          </Text>
        </>
      ) : null}
      <Button href={`${storeUrl}/account/orders`}>View Order</Button>
    </Layout>
  )
}
