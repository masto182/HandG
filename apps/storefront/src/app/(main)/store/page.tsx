import { Metadata } from "next"

import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import StoreTemplate from "@modules/store/templates"
import { getMembershipStatus, isApprovedMember } from "@lib/data/membership"
import { getEarlyAccessConfig } from "@lib/data/early-access"

export const metadata: Metadata = {
  title: "Collection | Hops & Glory",
  description: "Browse the Hops & Glory private collection.",
}

type Params = {
  searchParams: Promise<{
    sortBy?: SortOptions
    page?: string
    view?: "grid" | "list"
    q?: string
    brewery?: string
    style?: string
    hops?: string
    hopsMode?: string
    freshness?: string
    collab?: string
    tags?: string
    abv?: string
    on_sale?: string
    available?: string
    hop_country?: string
  }>
}

export default async function StorePage(props: Params) {
  const searchParams = await props.searchParams
  const { sortBy, page, view, ...filterParams } = searchParams
  const membershipStatus = await getMembershipStatus()
  const earlyAccess = await getEarlyAccessConfig()

  return (
    <StoreTemplate
      sortBy={sortBy}
      page={page}
      countryCode="au"
      canSeePricing={isApprovedMember(membershipStatus)}
      filterParams={filterParams}
      view={view || "grid"}
      viewerTier={earlyAccess.viewerTier}
      earlyAccessOffsets={earlyAccess.offsets}
    />
  )
}
