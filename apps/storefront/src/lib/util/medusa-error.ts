type MedusaError = {
  response?: {
    data: { message?: string } | string
    status: number
    headers: unknown
  }
  request?: unknown
  message?: string
  config?: { url: string; baseURL: string }
}

const STALE_CART_PATTERNS = [
  /do not exist or belong to a product/i,
  /product that is not published/i,
  /region was not found/i,
  /Cart (?:with )?id .* (?:was )?not found/i,
  /Cart id not found/i,
  /Region (?:with )?id .* (?:was )?not found/i,
]

/**
 * Returns true if the error indicates the user's cart references entities
 * that have since been deleted (region, variants, products) and is therefore
 * unrecoverable in-place. Callers should removeCartId() and recreate.
 */
export function isStaleCartError(error: unknown): boolean {
  const err = error as MedusaError & { message?: string }
  const responseMessage =
    typeof err?.response?.data === "object" && err.response?.data !== null
      ? (err.response.data as { message?: string }).message
      : typeof err?.response?.data === "string"
      ? err.response.data
      : undefined
  const candidates = [err?.message, responseMessage].filter(
    (s): s is string => typeof s === "string" && s.length > 0
  )
  return candidates.some((msg) => STALE_CART_PATTERNS.some((rx) => rx.test(msg)))
}

export default function medusaError(error: unknown): never {
  const err = error as MedusaError
  if (err.response) {
    const u = new URL(err.config?.url ?? "", err.config?.baseURL ?? "")
    console.error("Resource:", u.toString())
    console.error("Response data:", err.response.data)
    console.error("Status code:", err.response.status)
    console.error("Headers:", err.response.headers)

    const data = err.response.data
    const message =
      typeof data === "object" && data !== null
        ? data.message || String(data)
        : data

    throw new Error(message.charAt(0).toUpperCase() + message.slice(1) + ".")
  } else if (err.request) {
    throw new Error("No response received: " + String(err.request))
  } else {
    throw new Error("Error setting up the request: " + err.message)
  }
}
