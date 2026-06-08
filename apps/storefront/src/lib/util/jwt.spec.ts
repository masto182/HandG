import { isJwtUsable } from "./jwt"

// Build a JWT-shaped string with the given payload (signature is irrelevant —
// isJwtUsable never verifies it).
function makeToken(payload: Record<string, unknown>): string {
  const b64url = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")
  return `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url(payload)}.sig`
}

describe("isJwtUsable", () => {
  it("rejects missing / empty tokens", () => {
    expect(isJwtUsable(undefined)).toBe(false)
    expect(isJwtUsable(null)).toBe(false)
    expect(isJwtUsable("")).toBe(false)
  })

  it("rejects malformed tokens (not three segments)", () => {
    expect(isJwtUsable("not-a-jwt")).toBe(false)
    expect(isJwtUsable("only.two")).toBe(false)
  })

  it("rejects an expired token", () => {
    const expired = makeToken({ exp: Math.floor(Date.now() / 1000) - 60 })
    expect(isJwtUsable(expired)).toBe(false)
  })

  it("accepts a non-expired token", () => {
    const valid = makeToken({ exp: Math.floor(Date.now() / 1000) + 3600 })
    expect(isJwtUsable(valid)).toBe(true)
  })

  it("accepts a token with no exp claim (presence-only fallback)", () => {
    const noExp = makeToken({ actor_id: "cus_123" })
    expect(isJwtUsable(noExp)).toBe(true)
  })

  it("rejects a token whose payload is not valid base64 JSON", () => {
    expect(isJwtUsable("aaa.!!!notbase64json!!!.sig")).toBe(false)
  })
})
