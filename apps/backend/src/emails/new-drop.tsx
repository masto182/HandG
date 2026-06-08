import * as React from "react"
import { Section, Text } from "@react-email/components"
import Layout from "./_components/Layout"
import Heading from "./_components/Heading"
import Button from "./_components/Button"

export type NewDropProps = {
  name: string
  beerName: string
  breweryName: string
  reason: string
  handle: string
  storeUrl: string
}

export const subject = (p: NewDropProps) => `New drop: ${p.beerName}`

export default function NewDropEmail({
  name = "Alex",
  beerName = "Julius",
  breweryName = "Tree House Brewing",
  reason = "a brewery you follow",
  handle = "tree-house-julius",
  storeUrl = "https://hopsandglory.au",
}: NewDropProps) {
  return (
    <Layout
      preview={`${beerName} by ${breweryName} just dropped — limited stock`}
      storeUrl={storeUrl}
      isMarketing
    >
      <Heading>Just dropped</Heading>
      <Text style={body}>Hi {name},</Text>
      <Text style={body}>
        <strong>{beerName}</strong> by {breweryName} just landed — you're getting this because you
        follow {reason}. Allocations are limited and move fast.
      </Text>
      <Section style={productBox}>
        <Text style={productName}>{beerName}</Text>
        <Text style={productBrewery}>{breweryName}</Text>
      </Section>
      <Button href={`${storeUrl}/products/${handle}`}>View Release</Button>
    </Layout>
  )
}

const body = {
  color: "#1E2421",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 16px",
}

const productBox = {
  border: "1px solid #D9E0DA",
  borderLeft: "3px solid #3F7C62",
  borderRadius: "6px",
  margin: "0 0 8px",
  padding: "14px 18px",
}

const productName = {
  color: "#1E2421",
  fontSize: "16px",
  fontWeight: 700,
  margin: "0 0 4px",
}

const productBrewery = {
  color: "#66706B",
  fontSize: "13px",
  margin: 0,
}
