import { Metadata } from "next"

import Hero from "@modules/home/components/hero"
import TrustBar from "@modules/home/components/trust-bar"
import NewArrivals from "@modules/home/components/new-arrivals"
import FeaturedBreweries from "@modules/home/components/featured-breweries"
import { getRegion } from "@lib/data/regions"
import { listProducts } from "@lib/data/products"
import { getMembershipStatus, isApprovedMember } from "@lib/data/membership"
import { listBreweries } from "@lib/data/breweries"
import { getEarlyAccessConfig } from "@lib/data/early-access"

export const metadata: Metadata = {
  title: "Hops & Glory | Private Collection",
  description:
    "A private collection of the most coveted, limited-release cans in existence. Membership by application or referral only.",
}

export default async function Home() {
  // Independent, always-needed fetches — parallel, not waterfalled.
  const [membershipStatus, region, earlyAccess] = await Promise.all([
    getMembershipStatus(),
    getRegion("au"),
    getEarlyAccessConfig(),
  ])
  const canSeePricing = isApprovedMember(membershipStatus)

  if (!region) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-hg-text-secondary">Loading...</p>
      </div>
    )
  }

  // products + breweries are independent of each other — fetch in parallel,
  // each degrading gracefully to [] on error (preserves prior try/catch behaviour).
  const [products, breweries] = await Promise.all([
    listProducts({ queryParams: { limit: 200 }, countryCode: "au" })
      .then(({ response }) => response.products || [])
      .catch(() => [] as any[]),
    listBreweries().catch(() => [] as any[]),
  ])

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const newDropsCount = products.filter(
    (p) => new Date(p.created_at) > sevenDaysAgo,
  ).length
  const lowStockCount = products.filter((p) => {
    const stock =
      p.variants?.reduce(
        (sum: number, v: any) => sum + (v.inventory_quantity ?? 0),
        0,
      ) ?? 0
    return stock > 0 && stock <= 3
  }).length

  const recentProducts = [...products]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 8)

  return (
    <>
      <Hero
        membershipStatus={membershipStatus}
        newDropsCount={newDropsCount}
        lowStockCount={lowStockCount}
      />
      <TrustBar />
      <NewArrivals
        products={recentProducts}
        region={region}
        canSeePricing={canSeePricing}
        viewerTier={earlyAccess.viewerTier}
        earlyAccessOffsets={earlyAccess.offsets}
      />
      <FeaturedBreweries
        breweries={breweries}
        canSeePricing={canSeePricing}
        isApproved={canSeePricing}
      />
    </>
  )
}
