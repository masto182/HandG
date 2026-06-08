import * as React from "react"
import { Hr, Link, Section, Text } from "@react-email/components"
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
  }).format(n)

export const subject = (p: WishlistOfferApprovedProps) => {
  if (p.items.length === 1) {
    return `Your offer on ${p.items[0].beerName} was accepted`
  }
  return `${p.items.length} of your wishlist offers were accepted`
}

export default function WishlistOfferApprovedEmail({
  name = "Alex",
  items = [
    {
      beerName: "Cloudwater DIPA",
      breweryName: "Cloudwater Brew Co",
      offerPrice: 35,
      currencyCode: "aud",
      handle: "cloudwater-dipa",
    },
    {
      beerName: "Cantillon Gueuze",
      breweryName: "Brasserie Cantillon",
      offerPrice: 58,
      currencyCode: "aud",
      handle: "cantillon-gueuze",
    },
  ],
  expiresInDays = 7,
  storeUrl = "https://hopsandglory.au",
}: WishlistOfferApprovedProps) {
  const previewBeer = items[0]?.beerName || ""
  return (
    <Layout
      preview={
        items.length === 1
          ? `Offer accepted on ${previewBeer} — complete your purchase to secure it`
          : `${items.length} offers accepted — complete purchase to secure your bottles`
      }
      storeUrl={storeUrl}
      isMarketing
    >
      <Heading>Offer{items.length > 1 ? "s" : ""} accepted</Heading>
      <Text style={body}>Hi {name},</Text>
      <Text style={body}>
        {items.length === 1
          ? "Your offer has been accepted at the price below."
          : `${items.length} of your offers have been accepted at the prices below.`}
      </Text>

      <Section style={offerTable}>
        {items.map((it, idx) => (
          <Section key={idx}>
            {idx > 0 ? <Hr style={rowDivider} /> : null}
            <Text style={offerBeer}>{it.beerName}</Text>
            {it.breweryName ? <Text style={offerBrewery}>{it.breweryName}</Text> : null}
            <Text style={offerPrice}>
              {fmt(it.offerPrice, it.currencyCode)}
              {"  "}
              <Link href={`${storeUrl}/products/${it.handle}`} style={buyLink}>
                Buy now →
              </Link>
            </Text>
          </Section>
        ))}
      </Section>

      {expiresInDays != null ? (
        <Text style={expiry}>
          Complete your purchase within{" "}
          <strong>
            {expiresInDays} day{expiresInDays === 1 ? "" : "s"}
          </strong>{" "}
          to secure your {items.length > 1 ? "bottles" : "bottle"}.
        </Text>
      ) : null}

      <Button href={`${storeUrl}/account/wishlist`}>View Wishlist</Button>
    </Layout>
  )
}

const body = {
  color: "#1E2421",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 16px",
}

const offerTable = {
  border: "1px solid #D9E0DA",
  borderRadius: "6px",
  margin: "0 0 20px",
  padding: "4px 16px",
}

const rowDivider = {
  borderColor: "#D9E0DA",
  margin: "0",
}

const offerBeer = {
  color: "#1E2421",
  fontSize: "15px",
  fontWeight: 700,
  margin: "12px 0 2px",
}

const offerBrewery = {
  color: "#66706B",
  fontSize: "13px",
  margin: "0 0 4px",
}

const offerPrice = {
  color: "#3F7C62",
  fontSize: "16px",
  fontWeight: 700,
  margin: "0 0 12px",
}

const buyLink = {
  color: "#3F7C62",
  fontSize: "13px",
  fontWeight: 500,
  textDecoration: "none",
}

const expiry = {
  color: "#66706B",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0 0 8px",
}
