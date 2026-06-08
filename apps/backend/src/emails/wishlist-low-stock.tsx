import * as React from "react"
import { Section, Text } from "@react-email/components"
import Layout from "./_components/Layout"
import Heading from "./_components/Heading"
import Button from "./_components/Button"

export type WishlistLowStockProps = {
  name: string
  beerName: string
  stockRemaining: number
  handle: string
  storeUrl: string
}

export const subject = (p: WishlistLowStockProps) => `${p.beerName} — only ${p.stockRemaining} left`

export default function WishlistLowStockEmail({
  name = "Alex",
  beerName = "Cloudwater DIPA",
  stockRemaining = 3,
  handle = "cloudwater-dipa",
  storeUrl = "https://hopsandglory.au",
}: WishlistLowStockProps) {
  return (
    <Layout
      preview={`${beerName} on your wishlist is down to ${stockRemaining} units`}
      storeUrl={storeUrl}
      isMarketing
    >
      <Heading>Running low</Heading>
      <Text style={body}>Hi {name},</Text>
      <Text style={body}>
        <strong>{beerName}</strong> on your wishlist is getting scarce. These are reserved for
        members who act first.
      </Text>
      <Section style={stockBox}>
        <Text style={stockLabel}>Units remaining</Text>
        <Text style={stockCount}>{stockRemaining}</Text>
      </Section>
      <Button href={`${storeUrl}/products/${handle}`}>Buy Now</Button>
    </Layout>
  )
}

const body = {
  color: "#1E2421",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 16px",
}

const stockBox = {
  backgroundColor: "#FFFBF0",
  border: "1px solid #D69A4F",
  borderRadius: "6px",
  margin: "0 0 8px",
  padding: "14px 20px",
  textAlign: "center" as const,
}

const stockLabel = {
  color: "#A06A2C",
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.08em",
  margin: "0 0 4px",
  textTransform: "uppercase" as const,
}

const stockCount = {
  color: "#1E2421",
  fontSize: "32px",
  fontWeight: 700,
  margin: 0,
}
