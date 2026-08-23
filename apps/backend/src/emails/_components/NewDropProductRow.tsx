import * as React from "react"
import { Img, Link, Text } from "@react-email/components"

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

function BeerCell({ product, storeUrl }: { product: NewDropDigestProduct; storeUrl: string }) {
  return (
    <>
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
    </>
  )
}

/**
 * Denser 2-column table-based grid (email clients - notably Outlook, which
 * uses Word's rendering engine - don't support CSS Grid/Flexbox, so
 * multi-column layouts have to be plain HTML tables). Pairs consecutive
 * products into grid rows; a trailing odd product spans the full row.
 * Columns collapse to a single stacked column on mobile via the
 * `.hg-drop-col` media-query rule declared in Layout's <Head>.
 */
export function NewDropProductGrid({
  products,
  storeUrl,
}: {
  products: NewDropDigestProduct[]
  storeUrl: string
}) {
  const rows: NewDropDigestProduct[][] = []
  for (let i = 0; i < products.length; i += 2) {
    rows.push(products.slice(i, i + 2))
  }

  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      border={0}
      style={gridTable}
    >
      <tbody>
        {rows.map((pair, idx) => (
          <tr key={idx}>
            {pair.length === 1 ? (
              <td className="hg-drop-col" width="100%" colSpan={2} style={gridCellFull}>
                <BeerCell product={pair[0]} storeUrl={storeUrl} />
              </td>
            ) : (
              <>
                <td className="hg-drop-col" width="48%" style={gridCellLeft}>
                  <BeerCell product={pair[0]} storeUrl={storeUrl} />
                </td>
                <td className="hg-drop-col" width="48%" style={gridCellRight}>
                  <BeerCell product={pair[1]} storeUrl={storeUrl} />
                </td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
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

const gridTable = {
  margin: "0 0 8px",
}

const gridCellBase = {
  verticalAlign: "top" as const,
  textAlign: "center" as const,
  paddingTop: "16px",
  paddingBottom: "16px",
}

const gridCellLeft = {
  ...gridCellBase,
  width: "48%",
  paddingRight: "2%",
}

const gridCellRight = {
  ...gridCellBase,
  width: "48%",
  paddingLeft: "2%",
}

const gridCellFull = {
  ...gridCellBase,
  width: "100%",
}

const productImage = {
  display: "block" as const,
  margin: "0 auto 8px",
  maxWidth: "100%",
  height: "auto",
  borderRadius: "6px",
  objectFit: "cover" as const,
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
