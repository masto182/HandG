import * as React from "react"
import { Hr, Text } from "@react-email/components"
import Layout from "./_components/Layout"
import Heading from "./_components/Heading"
import Button from "./_components/Button"
import {
  NewDropProductGrid,
  body,
  sectionHeading,
  moreText,
  productLinkStyle,
  type NewDropDigestProduct,
} from "./_components/NewDropProductRow"
import { Link } from "@react-email/components"

export type { NewDropDigestProduct }

export type NewDropDigestSection = {
  label: string
  products: NewDropDigestProduct[]
}

export type NewDropDigestProps = {
  name: string
  /** Beers from breweries the customer follows - lead section when present. */
  brewerySection: NewDropDigestSection | null
  /** Beers matching a followed hop, from breweries the customer does NOT follow. */
  hopSection: NewDropDigestSection | null
  /** Beers matched only via the blanket "new drops" opt-in - lowest priority. */
  generalSection: { products: NewDropDigestProduct[] } | null
  storeUrl: string
}

type OrderedSection = {
  kind: "brewery" | "hop" | "general"
  label: string
  products: NewDropDigestProduct[]
}

/** Beyond this many products (across ALL sections combined), show a "+N more"
 * link instead of more rows - keeps HTML size well under Gmail's ~102KB
 * clipping threshold. Trims the lowest-priority section first. */
const MAX_DISPLAYED = 30

const sectionDivider = {
  borderColor: "#D9E0DA",
  margin: "16px 0",
}

function orderedSections(p: NewDropDigestProps): OrderedSection[] {
  const sections: OrderedSection[] = []
  if (p.brewerySection?.products.length) {
    sections.push({
      kind: "brewery",
      label: p.brewerySection.label,
      products: p.brewerySection.products,
    })
  }
  if (p.hopSection?.products.length) {
    sections.push({ kind: "hop", label: p.hopSection.label, products: p.hopSection.products })
  }
  if (p.generalSection?.products.length) {
    sections.push({ kind: "general", label: "", products: p.generalSection.products })
  }
  return sections
}

/** Caps total displayed products across all sections at MAX_DISPLAYED,
 * dropping from the lowest-priority (last) section first. */
function capSections(sections: OrderedSection[]): {
  sections: OrderedSection[]
  remaining: number
} {
  const total = sections.reduce((n, s) => n + s.products.length, 0)
  if (total <= MAX_DISPLAYED) return { sections, remaining: 0 }

  let budget = MAX_DISPLAYED
  const capped: OrderedSection[] = []
  for (const section of sections) {
    if (budget <= 0) break
    const take = section.products.slice(0, budget)
    if (take.length) capped.push({ ...section, products: take })
    budget -= take.length
  }
  return { sections: capped, remaining: total - MAX_DISPLAYED }
}

function sectionSubHeading(section: OrderedSection, isLead: boolean): string | null {
  if (section.kind === "brewery") return null // always the lead when present - no redundant sub-heading
  if (section.kind === "hop") {
    return isLead ? null : `Also featuring ${section.label}`
  }
  return isLead ? null : "Other new drops"
}

function leadHeading(sections: OrderedSection[]): string {
  const lead = sections[0]
  if (!lead) return "New drops just landed"
  if (lead.kind === "brewery") return `New releases from ${lead.label}`
  if (lead.kind === "hop") return `New beers featuring ${lead.label}`
  return "New drops just landed"
}

export const subject = (p: NewDropDigestProps) => {
  const all = orderedSections(p).flatMap((s) => s.products)
  if (all.length === 1) return `New drop: ${all[0]?.beerName ?? "just landed"}`
  return leadHeading(orderedSections(p))
}

const SAMPLE_PRODUCT: NewDropDigestProduct = {
  beerName: "An 7 / Year 7",
  breweryName: "Messorem",
  image: null,
  handle: "messorem-an-7-year-7",
  dispatchId: null,
}

export default function NewDropDigestEmail({
  name = "Collector",
  brewerySection = { label: "Messorem", products: [SAMPLE_PRODUCT] },
  hopSection = null,
  generalSection = null,
  storeUrl = "https://hopsandglory.au",
}: NewDropDigestProps) {
  const all = orderedSections({ name, brewerySection, hopSection, generalSection, storeUrl })
  const { sections, remaining } = capSections(all)
  const heading = leadHeading(all)

  const previewSource = all.flatMap((s) => s.products)
  const preview =
    previewSource.length === 1
      ? `${previewSource[0]?.beerName} just dropped - see it now`
      : `${previewSource
          .slice(0, 2)
          .map((p) => p.beerName)
          .join(", ")}${
          previewSource.length > 2 ? ` and ${previewSource.length - 2} more` : ""
        } just dropped`

  return (
    <Layout preview={preview} storeUrl={storeUrl} isMarketing>
      <Heading>{heading}</Heading>
      <Text style={body}>Hi {name},</Text>

      {sections.map((section, sectionIdx) => {
        const isLead = sectionIdx === 0
        const subHeading = sectionSubHeading(section, isLead)
        return (
          <React.Fragment key={section.kind}>
            {sectionIdx > 0 ? <Hr style={sectionDivider} /> : null}
            {subHeading ? <Text style={sectionHeading}>{subHeading}</Text> : null}
            <NewDropProductGrid products={section.products} storeUrl={storeUrl} />
          </React.Fragment>
        )
      })}

      {remaining > 0 ? (
        <Text style={moreText}>
          Plus {remaining} more release{remaining === 1 ? "" : "s"} -{" "}
          <Link href={`${storeUrl}/store?sortBy=created_at`} style={productLinkStyle}>
            see them all
          </Link>
        </Text>
      ) : null}

      <Button href={`${storeUrl}/store?sortBy=created_at`}>View all new drops</Button>
    </Layout>
  )
}
