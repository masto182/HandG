import { MetadataRoute } from "next"

const STORE_URL = process.env.NEXT_PUBLIC_STORE_URL || "https://example.com"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", "/cart", "/checkout", "/apply/pending", "/apply/rejected"],
    },
    sitemap: `${STORE_URL}/sitemap.xml`,
  }
}
