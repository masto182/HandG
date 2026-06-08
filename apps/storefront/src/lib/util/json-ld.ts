const STORE_URL = process.env.NEXT_PUBLIC_STORE_URL || "https://example.com"

/**
 * Serialize a JSON-LD object for embedding in a <script type="application/ld+json">
 * via dangerouslySetInnerHTML. Escapes `<` so a value containing `</script>`
 * (e.g. a malicious product title/description) cannot break out of the script
 * element. Escaping `<` alone is sufficient and standard for this purpose.
 */
export function serializeJsonLd(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c")
}

export function buildProductJsonLd(product: {
  title?: string
  description?: string
  thumbnail?: string | null
  handle?: string
  metadata?: any
  variants?: Array<{
    sku?: string | null
    // The store product fetch populates `calculated_price` (major units /
    // dollars), NOT the admin-only `prices` array.
    calculated_price?: {
      calculated_amount: number
      currency_code: string
    } | null
    inventory_quantity?: number
  }>
}) {
  const meta = product.metadata as any
  const variant = product.variants?.[0]
  const price = variant?.calculated_price
  const inStock = product.variants?.some((v) => (v.inventory_quantity ?? 0) > 0)

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

  if (price && typeof price.calculated_amount === "number") {
    schema.offers = {
      "@type": "Offer",
      // calculated_amount is already in dollars (major units) — do NOT /100.
      price: price.calculated_amount.toFixed(2),
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
