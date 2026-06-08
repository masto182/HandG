import * as React from "react"
import { Column, Row, Section, Text } from "@react-email/components"
import Layout from "./_components/Layout"
import Heading from "./_components/Heading"
import Button from "./_components/Button"

export type WishlistPriceAlertProps = {
  name: string
  beerName: string
  currentPrice: string
  targetPrice: string
  handle: string
  storeUrl: string
}

export const subject = (p: WishlistPriceAlertProps) => `${p.beerName} hit your target price`

export default function WishlistPriceAlertEmail({
  name = "Alex",
  beerName = "Cloudwater DIPA",
  currentPrice = "38.00",
  targetPrice = "45.00",
  handle = "cloudwater-dipa",
  storeUrl = "https://hopsandglory.au",
}: WishlistPriceAlertProps) {
  return (
    <Layout
      preview={`${beerName} is now ${currentPrice} — at or below your target`}
      storeUrl={storeUrl}
      isMarketing
    >
      <Heading>Price alert</Heading>
      <Text style={body}>Hi {name},</Text>
      <Text style={body}>
        <strong>{beerName}</strong> on your wishlist has dropped to your target price.
      </Text>
      <Section style={{ margin: "0 0 8px" }}>
        <Row>
          <Column style={{ paddingRight: "8px" }}>
            <Section style={priceBoxCurrent}>
              <Text style={priceLabel}>Current price</Text>
              <Text style={priceValueCurrent}>{currentPrice}</Text>
            </Section>
          </Column>
          <Column style={{ paddingLeft: "8px" }}>
            <Section style={priceBoxTarget}>
              <Text style={priceLabel}>Your target</Text>
              <Text style={priceValueTarget}>{targetPrice}</Text>
            </Section>
          </Column>
        </Row>
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

const priceBoxCurrent = {
  backgroundColor: "#E8F2EC",
  border: "1px solid #3F7C62",
  borderRadius: "6px",
  padding: "14px 16px",
  textAlign: "center" as const,
}

const priceBoxTarget = {
  backgroundColor: "#F5F7F4",
  border: "1px solid #D9E0DA",
  borderRadius: "6px",
  padding: "14px 16px",
  textAlign: "center" as const,
}

const priceLabel = {
  color: "#66706B",
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.08em",
  margin: "0 0 4px",
  textTransform: "uppercase" as const,
}

const priceValueCurrent = {
  color: "#3F7C62",
  fontSize: "20px",
  fontWeight: 700,
  margin: 0,
}

const priceValueTarget = {
  color: "#8A948E",
  fontSize: "20px",
  fontWeight: 600,
  margin: 0,
  textDecoration: "line-through",
}
