import { MetadataRoute } from "next"
import { sdk } from "@lib/config"
import { listBreweries } from "@lib/data/breweries"

const STORE_URL = process.env.NEXT_PUBLIC_STORE_URL || "https://example.com"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${STORE_URL}`, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${STORE_URL}/store`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${STORE_URL}/apply`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${STORE_URL}/breweries`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
  ]

  let productRoutes: MetadataRoute.Sitemap = []
  let breweryRoutes: MetadataRoute.Sitemap = []

  try {
    const data = await sdk.client.fetch<{ products: any[] }>(
      "/store/products?limit=200&fields=handle,updated_at",
      { method: "GET", next: { revalidate: 3600 } }
    )
    productRoutes = (data.products || []).map((p: any) => ({
      url: `${STORE_URL}/products/${p.handle}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }))
  } catch {}

  try {
    const breweries = await listBreweries()
    breweryRoutes = breweries.map((b: any) => ({
      url: `${STORE_URL}/breweries/${b.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }))
  } catch {}

  return [...staticRoutes, ...productRoutes, ...breweryRoutes]
}
