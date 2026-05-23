const STORE_URL = process.env.NEXT_PUBLIC_STORE_URL || "https://example.com"

export function buildProductJsonLd(product: {
  title?: string
  description?: string
  thumbnail?: string | null
  handle?: string
  metadata?: any
  variants?: Array<{
    sku?: string | null
    prices?: Array<{ amount: number; currency_code: string }>
    inventory_quantity?: number
  }>
}) {
  const meta = product.metadata as any
  const variant = product.variants?.[0]
  const price = variant?.prices?.[0]
  const inStock = product.variants?.some(
    (v) => (v.inventory_quantity ?? 0) > 0
  )

  const schema: any = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title || "",
    url: `${STORE_URL}/products/${product.handle}`,
  }

  if (product.description) schema.description = product.description
  if (product.thumbnail) schema.image = product.thumbnail

  const breweryName = meta?.brewery_name || meta?.brewery
  if (breweryName) {
    schema.brand = { "@type": "Brand", name: breweryName }
  }

  if (variant?.sku) schema.sku = variant.sku

  if (price) {
    schema.offers = {
      "@type": "Offer",
      price: (price.amount / 100).toFixed(2),
      priceCurrency: price.currency_code.toUpperCase(),
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `${STORE_URL}/products/${product.handle}`,
    }
  }

  return schema
}

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Hops & Glory",
    url: STORE_URL,
    logo: `${STORE_URL}/opengraph-image.jpg`,
    description:
      "A private collection of the most coveted, limited releases. Membership by application or referral only.",
  }
}

export function buildWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Hops & Glory",
    url: STORE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${STORE_URL}/store?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }
}
