import { Metadata } from "next"

import Hero from "@modules/home/components/hero"

import NewArrivals from "@modules/home/components/new-arrivals"
import FeaturedBreweries from "@modules/home/components/featured-breweries"
import { getRegion } from "@lib/data/regions"
import { listProducts } from "@lib/data/products"
import { getMembershipStatus, isApprovedMember } from "@lib/data/membership"
import { listBreweries } from "@lib/data/breweries"

export const metadata: Metadata = {
  title: "Hops & Glory | Private Collection",
  description:
    "A private collection of the most coveted, limited-release cans in existence. Membership by application or referral only.",
}

export default async function Home() {
  const membershipStatus = await getMembershipStatus()
  const canSeePricing = isApprovedMember(membershipStatus)
  const region = await getRegion("au")

  if (!region) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-hg-text-secondary">Loading...</p>
      </div>
    )
  }

  let products: any[] = []
  try {
    const { response } = await listProducts({
      queryParams: { limit: 200 },
      countryCode: "au",
    })
    products = response.products || []
  } catch {}

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const newDropsCount = products.filter((p) => new Date(p.created_at) > sevenDaysAgo).length
  const lowStockCount = products.filter((p) => {
    const stock = p.variants?.reduce((sum: number, v: any) => sum + (v.inventory_quantity ?? 0), 0) ?? 0
    return stock > 0 && stock <= 3
  }).length

  const recentProducts = [...products]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8)

  let breweries: any[] = []
  try {
    breweries = await listBreweries()
  } catch {}

  return (
    <>
      <Hero membershipStatus={membershipStatus} newDropsCount={newDropsCount} lowStockCount={lowStockCount} />
      <NewArrivals products={recentProducts} region={region} canSeePricing={canSeePricing} />
      <FeaturedBreweries breweries={breweries} canSeePricing={canSeePricing} isApproved={canSeePricing} />
    </>
  )
}
