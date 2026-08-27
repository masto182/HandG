import * as React from "react"
import { Img, Text } from "@react-email/components"

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

function formatAud(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function discountLabel(item: SpecialsBatchItem): string {
  return item.discountType === "percentage"
    ? `${item.discountValue}% off`
    : `${formatAud(item.discountValue * 100)} off`
}

function ProductCell({ item, storeUrl }: { item: SpecialsBatchItem; storeUrl: string }) {
  return (
    <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0}>
      <tbody>
        <tr>
          <td style={{ verticalAlign: "top", paddingBottom: "16px" }}>
            {isAbsoluteUrl(item.productThumbnail) ? (
              <Img
                src={item.productThumbnail}
                width={72}
                height={72}
                alt={item.productTitle}
                style={thumb}
              />
            ) : null}
          </td>
          <td style={{ verticalAlign: "top", paddingLeft: "12px", paddingBottom: "16px" }}>
            <Text style={productName}>
              <a href={`${storeUrl}/products/${item.productHandle}`} style={productLink}>
                {item.productTitle}
              </a>
            </Text>
            <Text style={priceRow}>
              <span style={strikePrice}>{formatAud(item.originalPrice)}</span>{" "}
              <span style={salePrice}>{formatAud(item.discountedPrice)}</span>
            </Text>
            <Text style={discountBadge}>{discountLabel(item)}</Text>
          </td>
        </tr>
      </tbody>
    </table>
  )
}

export function SpecialsProductList({
  items,
  storeUrl,
}: {
  items: SpecialsBatchItem[]
  storeUrl: string
}) {
  return (
    <>
      {items.map((item, idx) => (
        <ProductCell key={idx} item={item} storeUrl={storeUrl} />
      ))}
    </>
  )
}

const thumb = {
  display: "block" as const,
  borderRadius: "6px",
  objectFit: "cover" as const,
}

const productName = {
  color: "#1E2421",
  fontSize: "15px",
  fontWeight: 700,
  margin: "0 0 4px",
}

const productLink = {
  color: "#1E2421",
  textDecoration: "none",
}

const priceRow = {
  margin: "0 0 4px",
  fontSize: "14px",
}

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
