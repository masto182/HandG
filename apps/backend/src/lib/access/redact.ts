/**
 * Public-view redaction helpers.
 *
 * Anonymous and non-approved viewers see product names, thumbnails, breweries
 * and styles, but we strip information they aren't supposed to have until
 * they're approved members: ABV, Untappd score, and pricing.
 *
 * The redaction is a small set of well-named pure functions so they can be
 * unit tested without spinning up the HTTP stack.
 */

const ABV_IN_DESCRIPTION = /[\d.]+%\s*ABV/g
const UNTAPPD_IN_DESCRIPTION = /\(Untappd:\s*[\d.]+\)/g
const DASH_DOT_FILLER = /\s*—\s*\.\s*/g
const MULTI_SPACE = /\s{2,}/g

export function redactDescription(description: string | null | undefined): string {
  if (!description) return ""
  return description
    .replace(ABV_IN_DESCRIPTION, "")
    .replace(UNTAPPD_IN_DESCRIPTION, "")
    .replace(DASH_DOT_FILLER, ". ")
    .replace(MULTI_SPACE, " ")
    .trim()
}

export function redactProductMetadata(
  metadata: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!metadata) return null
  const copy = { ...metadata }
  delete (copy as any).abv
  delete (copy as any).untappd_score
  delete (copy as any).untappd_rating
  return copy
}

type ProductShape = {
  description?: string | null
  metadata?: Record<string, unknown> | null
  variants?: Array<{ prices?: unknown; calculated_price?: unknown; [k: string]: unknown }> | null
  [k: string]: unknown
}

/**
 * Returns a new product object safe for anonymous / pending / rejected /
 * suspended viewers: pricing stripped, ABV + Untappd redacted from
 * description and metadata.
 */
export function redactProductForPublic<T extends ProductShape>(product: T): T {
  const variants = Array.isArray(product.variants)
    ? product.variants.map((v) => ({
        ...v,
        prices: undefined,
        calculated_price: undefined,
      }))
    : product.variants

  return {
    ...product,
    description: redactDescription(product.description),
    metadata: redactProductMetadata(product.metadata),
    variants,
  } as T
}
