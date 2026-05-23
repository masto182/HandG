import {
  SITE_CONFIG_REGISTRY,
  PUBLIC_SITE_CONFIG_KEYS,
  coerceEnvValue,
} from "../../modules/site-config/registry"

describe("site-config registry", () => {
  it("has every entry's key field match the registry record key", () => {
    for (const [k, def] of Object.entries(SITE_CONFIG_REGISTRY)) {
      expect(def.key).toBe(k)
    }
  })

  it("PUBLIC_SITE_CONFIG_KEYS contains exactly the isPublic:true keys", () => {
    const expected = Object.values(SITE_CONFIG_REGISTRY)
      .filter((d) => d.isPublic)
      .map((d) => d.key)
      .sort()
    expect([...PUBLIC_SITE_CONFIG_KEYS].sort()).toEqual(expected)
  })

  it("every public default validates", () => {
    for (const def of Object.values(SITE_CONFIG_REGISTRY)) {
      const err = def.validate ? def.validate(def.default) : null
      expect(err).toBeNull()
    }
  })

  it("payid_alias is public, has env fallback, and validates a string default", () => {
    const def = SITE_CONFIG_REGISTRY.payid_alias
    expect(def.isPublic).toBe(true)
    expect(def.envVar).toBe("NEXT_PUBLIC_PAYID_ALIAS")
    expect(def.type).toBe("string")
  })

  it("vip_thresholds default has all 5 tiers", () => {
    const def = SITE_CONFIG_REGISTRY.vip_thresholds
    const v = def.default as Record<string, number>
    expect(["vip1", "vip2", "vip3", "vip4", "vip5"].every((t) => typeof v[t] === "number")).toBe(true)
  })

  it("rejects non-public keys from the public list (security)", () => {
    expect(PUBLIC_SITE_CONFIG_KEYS).not.toContain("payid_hold_hours")
    expect(PUBLIC_SITE_CONFIG_KEYS).not.toContain("vip_thresholds")
    expect(PUBLIC_SITE_CONFIG_KEYS).not.toContain("email_from")
    expect(PUBLIC_SITE_CONFIG_KEYS).not.toContain("email_orders_to")
  })
})

describe("coerceEnvValue", () => {
  it("coerces booleans", () => {
    expect(coerceEnvValue("boolean", "true")).toBe(true)
    expect(coerceEnvValue("boolean", "false")).toBe(false)
    expect(coerceEnvValue("boolean", "1")).toBe(true)
    expect(coerceEnvValue("boolean", "0")).toBe(false)
    expect(coerceEnvValue("boolean", "yes")).toBe(true)
    expect(coerceEnvValue("boolean", "no")).toBe(false)
  })

  it("coerces numbers", () => {
    expect(coerceEnvValue("number", "24")).toBe(24)
    expect(coerceEnvValue("number", "0.5")).toBe(0.5)
  })

  it("returns raw on number coercion failure (validator catches it)", () => {
    expect(coerceEnvValue("number", "not-a-number")).toBe("not-a-number")
  })

  it("parses json", () => {
    expect(coerceEnvValue("json", '{"a":1}')).toEqual({ a: 1 })
  })

  it("returns raw on json parse failure", () => {
    expect(coerceEnvValue("json", "{not json")).toBe("{not json")
  })

  it("returns string unchanged", () => {
    expect(coerceEnvValue("string", "hello")).toBe("hello")
  })
})

describe("validators", () => {
  it("payid_hold_hours rejects 0 and >168", () => {
    const v = SITE_CONFIG_REGISTRY.payid_hold_hours.validate!
    expect(v(0)).toBeTruthy()
    expect(v(169)).toBeTruthy()
    expect(v(24)).toBeNull()
  })

  it("email_orders_to rejects non-emails", () => {
    const v = SITE_CONFIG_REGISTRY.email_orders_to.validate!
    expect(v("not-an-email")).toBeTruthy()
    expect(v("ops@example.com")).toBeNull()
  })

  it("vip_thresholds rejects missing tier", () => {
    const v = SITE_CONFIG_REGISTRY.vip_thresholds.validate!
    expect(v({ vip1: 100, vip2: 250, vip3: 450, vip4: 700 })).toBeTruthy()
  })

  it("vip_early_access_offsets_hours allows zero", () => {
    const v = SITE_CONFIG_REGISTRY.vip_early_access_offsets_hours.validate!
    expect(v({ vip1: 0, vip2: 0, vip3: 0, vip4: 0, vip5: 0 })).toBeNull()
  })
})
