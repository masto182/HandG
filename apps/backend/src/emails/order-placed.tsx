import * as React from "react"
import { Column, Hr, Row, Section, Text } from "@react-email/components"
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

export const subject = (p: OrderPlacedProps) => `Order confirmed · #${p.orderDisplayId}`

const fmt = (n: number, ccy: string) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: ccy.toUpperCase(),
  }).format(n / 100)

export default function OrderPlacedEmail({
  name = "Alex",
  orderDisplayId = "1234",
  items = [
    { title: "Hill Farmstead Everett · 750ml", quantity: 1, unit_price: 4200 },
    { title: "Cantillon Gueuze · 375ml", quantity: 2, unit_price: 3800 },
  ],
  total = 11800,
  currencyCode = "aud",
  isPickup = false,
  payidAlias = "payments@hopsandglory.au",
  storeUrl = "https://hopsandglory.au",
}: OrderPlacedProps) {
  return (
    <Layout
      preview={`Order #${orderDisplayId} confirmed — here's your receipt`}
      storeUrl={storeUrl}
    >
      <Heading>Order Confirmed</Heading>
      <Text style={body}>Hi {name},</Text>
      <Text style={body}>
        Thanks for your order. Here&apos;s a summary of what you&apos;ve secured.
      </Text>

      <Section style={tableContainer}>
        <Row style={tableHeaderRow}>
          <Column>
            <Text style={tableHeaderCell}>Item</Text>
          </Column>
          <Column align="right">
            <Text style={{ ...tableHeaderCell, textAlign: "right" }}>Price</Text>
          </Column>
        </Row>
        <Hr style={tableDivider} />
        {items.map((it, i) => (
          <Row key={i} style={tableRow}>
            <Column>
              <Text style={tableCell}>
                {it.quantity > 1 ? `${it.quantity} × ` : ""}
                {it.title}
              </Text>
            </Column>
            <Column align="right">
              <Text style={{ ...tableCell, textAlign: "right" }}>
                {fmt(it.unit_price * it.quantity, currencyCode)}
              </Text>
            </Column>
          </Row>
        ))}
        <Hr style={tableDivider} />
        <Row>
          <Column>
            <Text style={tableTotalCell}>Total</Text>
          </Column>
          <Column align="right">
            <Text style={{ ...tableTotalCell, textAlign: "right" }}>
              {fmt(total, currencyCode)}
            </Text>
          </Column>
        </Row>
      </Section>

      {!isPickup && payidAlias ? (
        <Section style={payidBox}>
          <Text style={payidLabel}>Payment instructions</Text>
          <Text style={payidBody}>
            Send payment to <span style={payidEmail}>{payidAlias}</span> using your bank&apos;s
            PayID transfer. Use the reference below so we can match your payment.
          </Text>
          <Text style={payidRef}>{orderDisplayId}</Text>
          <Text style={payidNote}>
            Your order will be held for 72 hours while we await payment.
          </Text>
        </Section>
      ) : null}

      <Text style={nextSteps}>
        {isPickup
          ? "We'll send a notification when your order is ready to collect."
          : "We'll send a shipping notification once your order is dispatched."}
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

const tableContainer = {
  border: "1px solid #D9E0DA",
  borderRadius: "6px",
  margin: "0 0 24px",
  padding: "0 16px",
}

const tableHeaderRow = {
  padding: "10px 0",
}

const tableHeaderCell = {
  color: "#3F7C62",
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.08em",
  margin: "10px 0",
  textTransform: "uppercase" as const,
}

const tableDivider = {
  borderColor: "#D9E0DA",
  margin: "0",
}

const tableRow = {
  padding: "8px 0",
}

const tableCell = {
  color: "#1E2421",
  fontSize: "14px",
  lineHeight: "1.4",
  margin: "8px 0",
}

const tableTotalCell = {
  color: "#1E2421",
  fontSize: "14px",
  fontWeight: 700,
  margin: "10px 0",
}

const payidBox = {
  backgroundColor: "#FFFBF0",
  border: "1px solid #D69A4F",
  borderRadius: "6px",
  margin: "0 0 20px",
  padding: "16px 20px",
}

const payidLabel = {
  color: "#A06A2C",
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.08em",
  margin: "0 0 8px",
  textTransform: "uppercase" as const,
}

const payidBody = {
  color: "#1E2421",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0 0 12px",
}

const payidEmail = {
  fontWeight: 600,
}

const payidRef = {
  backgroundColor: "#FFF3D6",
  borderRadius: "4px",
  color: "#1E2421",
  fontFamily: "monospace",
  fontSize: "18px",
  fontWeight: 700,
  letterSpacing: "0.06em",
  margin: "0 0 12px",
  padding: "8px 12px",
  display: "inline-block" as const,
}

const payidNote = {
  color: "#66706B",
  fontSize: "13px",
  margin: 0,
}

const nextSteps = {
  color: "#66706B",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0 0 8px",
}
