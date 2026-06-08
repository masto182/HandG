/**
 * Lightweight usability check for the Medusa JWT cookie at the edge: returns
 * false for missing, malformed, or EXPIRED tokens. The signature is NOT
 * verified (the storefront has no business holding the JWT secret) — real
 * authorization is enforced server-side by Medusa on every API call, which
 * rejects forged tokens. This is a UX gate plus expiry hygiene, not the auth
 * boundary.
 */
export function isJwtUsable(token: string | undefined | null): boolean {
  if (!token) return false
  const parts = token.split(".")
  if (parts.length !== 3) return false
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const json =
      typeof Buffer !== "undefined"
        ? Buffer.from(b64, "base64").toString("utf8")
        : atob(b64)
    const payload = JSON.parse(json) as { exp?: number }
    if (typeof payload.exp === "number" && payload.exp * 1000 <= Date.now()) {
      return false
    }
    return true
  } catch {
    return false
  }
}
