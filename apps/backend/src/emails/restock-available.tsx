import * as React from "react"
import { Text } from "@react-email/components"
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

export const subject = (p: RestockAvailableProps) =>
  `${p.beerName} is back in stock`

export default function RestockAvailableEmail({
  name,
  beerName,
  breweryName,
  handle,
  storeUrl,
}: RestockAvailableProps) {
  return (
    <Layout
      preview={`${beerName} by ${breweryName} is available again`}
      storeUrl={storeUrl}
      isMarketing
    >
      <Heading>Back in Stock</Heading>
      <Text>Hi {name},</Text>
      <Text>
        <strong>{beerName}</strong> by {breweryName} is available again. Act
        quickly — limited quantities.
      </Text>
      <Button href={`${storeUrl}/products/${handle}`}>View Product</Button>
    </Layout>
  )
}
