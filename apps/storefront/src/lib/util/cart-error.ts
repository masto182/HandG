export type CartErrorKind = "early_access" | "out_of_stock" | "generic"

/**
 * Classifies an add-to-cart failure into a small set of user-facing kinds.
 *
 * In production, Next masks Server Action errors with a generic
 * "An error occurred in the Server Components render..." message. We must never
 * surface that (or any raw server text) to shoppers, so anything we don't
 * explicitly recognise collapses to "generic".
 */
export function classifyCartError(err: unknown): CartErrorKind {
  const msg = ((err as { message?: unknown })?.message ?? "")
    .toString()
    .toLowerCase()

  if (msg.includes("early-access") || msg.includes("not_yet_available")) {
    return "early_access"
  }
  if (
    msg.includes("inventory") ||
    msg.includes("out of stock") ||
    msg.includes("sold out")
  ) {
    return "out_of_stock"
  }
  return "generic"
}

const MESSAGES: Record<CartErrorKind, string> = {
  early_access: "Not yet available — check back when early access opens",
  out_of_stock: "Out of stock",
  generic: "Couldn't add this item to cart. Please try again.",
}

/** Full sentence suitable for inline text or a toast. */
export function cartErrorMessage(err: unknown): string {
  return MESSAGES[classifyCartError(err)]
}
