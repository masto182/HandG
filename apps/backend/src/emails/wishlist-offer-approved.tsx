import * as React from "react"
import { Text } from "@react-email/components"
import Layout from "./_components/Layout"
import Heading from "./_components/Heading"
import Button from "./_components/Button"

export type WishlistOfferItem = {
  beerName: string
  breweryName: string
  offerPrice: number
  currencyCode: string
  handle: string
}

export type WishlistOfferApprovedProps = {
  name: string
  items: WishlistOfferItem[]
  expiresInDays: number | null
  storeUrl: string
}

const fmt = (n: number, ccy: string) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: ccy.toUpperCase(),
  }).format(n / 100)

export const subject = (p: WishlistOfferApprovedProps) => {
  if (p.items.length === 1) {
    return `Your offer on ${p.items[0].beerName} was accepted`
  }
  return `${p.items.length} of your wishlist offers were accepted`
}

export default function WishlistOfferApprovedEmail({
  name,
  items,
  expiresInDays,
  storeUrl,
}: WishlistOfferApprovedProps) {
  const previewBeer = items[0]?.beerName || ""
  return (
    <Layout
      preview={`Offer accepted${previewBeer ? `: ${previewBeer}` : ""}`}
      storeUrl={storeUrl}
      isMarketing
    >
      <Heading>Offer{items.length > 1 ? "s" : ""} Accepted</Heading>
      <Text>Hi {name},</Text>
      <Text>
        {items.length === 1
          ? "Your offer has been accepted at the price below."
          : `${items.length} of your offers have been accepted at the prices below.`}
      </Text>
      {items.map((it, idx) => (
        <Text key={idx}>
          <strong>{it.beerName}</strong>
          {it.breweryName ? ` by ${it.breweryName}` : ""} —{" "}
          <strong style={{ color: "#D4A843" }}>
            {fmt(it.offerPrice, it.currencyCode)}
          </strong>
          {" · "}
          <a href={`${storeUrl}/products/${it.handle}`}>Buy now</a>
        </Text>
      ))}
      {expiresInDays != null && (
        <Text>
          Complete your purchase within{" "}
          <strong>{expiresInDays} days</strong> to secure the{" "}
          {items.length > 1 ? "bottles" : "bottle"}.
        </Text>
      )}
      <Button href={`${storeUrl}/account/wishlist`}>View Wishlist</Button>
    </Layout>
  )
}
