import * as React from "react"
import { Img, Link, Text } from "@react-email/components"

export type SpecialsBatchItem = {
  productTitle: string
  productHandle: string
  productThumbnail: string | null
  originalPrice: number
  discountedPrice: number
  discountType: "percentage" | "fixed"
  discountValue: number
}

export function isAbsoluteUrl(url: string | null): url is string {
  return !!url && /^https?:\/\//i.test(url)
}

function formatAud(amount: number): string {
  return `$${amount.toFixed(2)}`
}

function discountLabel(item: SpecialsBatchItem): string {
  return item.discountType === "percentage"
    ? `${item.discountValue}% off`
    : `${formatAud(item.discountValue)} off`
}

function SpecialsCell({ item, storeUrl }: { item: SpecialsBatchItem; storeUrl: string }) {
  return (
    <>
      {isAbsoluteUrl(item.productThumbnail) ? (
        <Img
          src={item.productThumbnail}
          width={96}
          height={96}
          alt={item.productTitle}
          style={productImage}
        />
      ) : null}
      <Text style={productName}>
        <Link href={`${storeUrl}/products/${item.productHandle}`} style={productLinkStyle}>
          {item.productTitle}
        </Link>
      </Text>
      <Text style={priceRow}>
        <span style={strikePrice}>{formatAud(item.originalPrice)}</span>{" "}
        <span style={salePrice}>{formatAud(item.discountedPrice)}</span>
      </Text>
      <Text style={discountBadge}>{discountLabel(item)}</Text>
    </>
  )
}

/** Same 2-column table-grid layout as NewDropProductGrid, styled for price rows. */
export function SpecialsProductGrid({
  items,
  storeUrl,
}: {
  items: SpecialsBatchItem[]
  storeUrl: string
}) {
  const rows: SpecialsBatchItem[][] = []
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2))
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
              <td className="hg-specials-col" width="100%" colSpan={2} style={gridCellFull}>
                <SpecialsCell item={pair[0]} storeUrl={storeUrl} />
              </td>
            ) : (
              <>
                <td className="hg-specials-col" width="48%" style={gridCellLeft}>
                  <SpecialsCell item={pair[0]} storeUrl={storeUrl} />
                </td>
                <td className="hg-specials-col" width="48%" style={gridCellRight}>
                  <SpecialsCell item={pair[1]} storeUrl={storeUrl} />
                </td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const gridTable = { margin: "0 0 8px" }

const gridCellBase = {
  verticalAlign: "top" as const,
  textAlign: "center" as const,
  paddingTop: "16px",
  paddingBottom: "16px",
}

const gridCellLeft = { ...gridCellBase, width: "48%", paddingRight: "2%" }
const gridCellRight = { ...gridCellBase, width: "48%", paddingLeft: "2%" }
const gridCellFull = { ...gridCellBase, width: "100%" }

const productImage = {
  display: "block" as const,
  margin: "0 auto 8px",
  maxWidth: "100%",
  height: "auto",
  borderRadius: "6px",
  objectFit: "cover" as const,
}

const productName = {
  color: "#1E2421",
  fontSize: "15px",
  fontWeight: 700,
  margin: "0 0 4px",
}

export const productLinkStyle = {
  color: "#1E2421",
  textDecoration: "none",
}

const priceRow = { margin: "0 0 2px", fontSize: "14px" }

const strikePrice = {
  color: "#8A928D",
  textDecoration: "line-through",
}

const salePrice = {
  color: "#3F7C62",
  fontWeight: 700,
  marginLeft: "6px",
}

const discountBadge = {
  color: "#B5511C",
  fontSize: "12px",
  fontWeight: 600,
  margin: 0,
}
