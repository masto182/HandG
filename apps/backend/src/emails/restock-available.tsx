import * as React from "react"
import { Section, Text } from "@react-email/components"
import Layout from "./_components/Layout"
import Heading from "./_components/Heading"
import Button from "./_components/Button"

export type RestockAvailableProps = {
  name: string
  beerName: string
  breweryName: string
  handle: string
  storeUrl: string
}

export const subject = (p: RestockAvailableProps) => `${p.beerName} is back in stock`

export default function RestockAvailableEmail({
  name = "Alex",
  beerName = "Hill Farmstead Everett",
  breweryName = "Hill Farmstead Brewery",
  handle = "hill-farmstead-everett",
  storeUrl = "https://hopsandglory.au",
}: RestockAvailableProps) {
  return (
    <Layout
      preview={`${beerName} by ${breweryName} is available again — limited stock`}
      storeUrl={storeUrl}
      isMarketing
    >
      <Heading>Back in stock</Heading>
      <Text style={body}>Hi {name},</Text>
      <Text style={body}>
        <strong>{beerName}</strong> by {breweryName} is available again. Stock is limited — these
        tend to go quickly.
      </Text>
      <Section style={productBox}>
        <Text style={productName}>{beerName}</Text>
        <Text style={productBrewery}>{breweryName}</Text>
      </Section>
      <Button href={`${storeUrl}/products/${handle}`}>View Product</Button>
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
