import * as React from "react"
import { Link, Text } from "@react-email/components"
import Layout from "./_components/Layout"
import Heading from "./_components/Heading"
import Button from "./_components/Button"
import {
  SpecialsProductGrid,
  productLinkStyle,
  type SpecialsBatchItem,
} from "./_components/SpecialsProductRow"

export type SpecialsBroadcastProps = {
  name: string
  message?: string | null
  items: SpecialsBatchItem[]
  storeUrl: string
}

/** Beyond this many specials, feature only the steepest discounts and link
 * to the rest - a 66-item email is a wall of noise, not a sale announcement,
 * and risks Gmail's ~102KB clipping threshold (same reasoning as
 * new-drop-digest.tsx's MAX_DISPLAYED). */
const MAX_FEATURED = 12

function featuredItems(items: SpecialsBatchItem[]): {
  featured: SpecialsBatchItem[]
  remaining: number
} {
  if (items.length <= MAX_FEATURED) return { featured: items, remaining: 0 }
  const sorted = [...items].sort((a, b) => b.discountValue - a.discountValue)
  return { featured: sorted.slice(0, MAX_FEATURED), remaining: items.length - MAX_FEATURED }
}

export const subject = (p: SpecialsBroadcastProps) => {
  if (p.items.length === 1) return `On special: ${p.items[0]?.productTitle ?? "one beer"}`
  return "This week's specials"
}

const SAMPLE_ITEM: SpecialsBatchItem = {
  productTitle: "An 7 / Year 7",
  productHandle: "messorem-an-7-year-7",
  productThumbnail: null,
  originalPrice: 25,
  discountedPrice: 20,
  discountType: "percentage",
  discountValue: 20,
}

export default function SpecialsBroadcastEmail({
  name = "Collector",
  message = null,
  items = [SAMPLE_ITEM],
  storeUrl = "https://hopsandglory.au",
}: SpecialsBroadcastProps) {
  const { featured, remaining } = featuredItems(items)
  const preview =
    items.length === 1
      ? `${items[0]?.productTitle} is on special - see it now`
      : `${items
          .slice(0, 2)
          .map((i) => i.productTitle)
          .join(", ")}${items.length > 2 ? ` and ${items.length - 2} more` : ""} on special now`

  return (
    <Layout preview={preview} storeUrl={storeUrl} isMarketing>
      <Heading>{items.length === 1 ? "On special" : "This week's specials"}</Heading>
      <Text style={greeting}>Hi {name},</Text>
      {message ? <Text style={greeting}>{message}</Text> : null}
      <SpecialsProductGrid items={featured} storeUrl={storeUrl} />
      {remaining > 0 ? (
        <Text style={moreText}>
          Plus {remaining} more special{remaining === 1 ? "" : "s"} -{" "}
          <Link href={`${storeUrl}/store?sortBy=created_at`} style={productLinkStyle}>
            see them all
          </Link>
        </Text>
      ) : null}
      <Button href={`${storeUrl}/store`}>Shop the specials</Button>
    </Layout>
  )
}

const greeting = {
  color: "#1E2421",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 16px",
}

const moreText = {
  color: "#66706B",
  fontSize: "13px",
  textAlign: "center" as const,
  margin: "8px 0 20px",
}
