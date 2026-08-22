import * as React from "react"
import { Hr, Img, Link, Section, Text } from "@react-email/components"

export type NewDropDigestProduct = {
  beerName: string
  breweryName: string
  /** Absolute URL only - relative/storefront paths will not render in email clients. */
  image: string | null
  handle: string
  /** alert_dispatch id for this (customer, product) pair - builds the click-tracking link. */
  dispatchId: string | null
  /** Matched followed-hop name(s) for this beer, shown as a small tag - null if none. */
  hopTag?: string | null
}

export function isAbsoluteUrl(url: string | null): url is string {
  return !!url && /^https?:\/\//i.test(url)
}

export function productLink(
  storeUrl: string,
  p: { handle: string; dispatchId: string | null }
): string {
  const base = `${storeUrl}/products/${p.handle}`
  return p.dispatchId ? `${base}?alert=${p.dispatchId}` : base
}

export function NewDropProductRow({
  product,
  storeUrl,
  showDivider,
}: {
  product: NewDropDigestProduct
  storeUrl: string
  showDivider: boolean
}) {
  return (
    <Section style={productSection}>
      {showDivider ? <Hr style={rowDivider} /> : null}
      {isAbsoluteUrl(product.image) ? (
        <Img
          src={product.image}
          width={96}
          height={96}
          alt={product.beerName}
          style={productImage}
        />
      ) : null}
      <Text style={productBeer}>
        <Link href={productLink(storeUrl, product)} style={productLinkStyle}>
          {product.beerName}
        </Link>
      </Text>
      {product.breweryName ? <Text style={productBrewery}>{product.breweryName}</Text> : null}
      {product.hopTag ? <Text style={hopTagStyle}>Featuring {product.hopTag}</Text> : null}
    </Section>
  )
}

export const sectionHeading = {
  color: "#1E2421",
  fontSize: "16px",
  fontWeight: 700,
  margin: "24px 0 8px",
}

export const body = {
  color: "#1E2421",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 16px",
}

const productSection = {
  margin: "0 0 8px",
  textAlign: "center" as const,
}

const productImage = {
  display: "block" as const,
  margin: "0 auto 8px",
  maxWidth: "100%",
  height: "auto",
  borderRadius: "6px",
  objectFit: "cover" as const,
}

const rowDivider = {
  borderColor: "#D9E0DA",
  margin: "16px 0",
}

const productBeer = {
  color: "#1E2421",
  fontSize: "15px",
  fontWeight: 700,
  margin: "0 0 2px",
}

export const productLinkStyle = {
  color: "#3F7C62",
  textDecoration: "none",
}

const productBrewery = {
  color: "#66706B",
  fontSize: "13px",
  margin: "0 0 4px",
}

const hopTagStyle = {
  color: "#3F7C62",
  fontSize: "12px",
  fontWeight: 600,
  margin: "0 0 4px",
}

export const moreText = {
  color: "#66706B",
  fontSize: "13px",
  margin: "16px 0",
  textAlign: "center" as const,
}
