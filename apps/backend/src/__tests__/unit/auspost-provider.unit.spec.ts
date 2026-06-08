import AusPostProviderService from "../../modules/auspost/service"
import { resetAusPostClientCache } from "../../modules/auspost/factory"

const noopLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
} as any

const auCtx = {
  shipping_address: { country_code: "AU", postal_code: "3000" },
  items: [{ quantity: 1, variant: { weight: 750 } }],
  currency_code: "aud",
}

function makeProvider(options: Record<string, unknown>) {
  resetAusPostClientCache()
  delete process.env.AUSPOST_API_KEY // force the deterministic stub client
  // deps.resolve throws — simulates the production fulfillment provider scope
  // where SiteConfig (a custom module) is NOT resolvable. Config must come
  // from provider options instead.
  return new AusPostProviderService(
    {
      logger: noopLogger,
      resolve: () => {
        throw new Error("siteConfig not in scope")
      },
    } as any,
    options as any
  )
}

describe("AusPostProviderService config resolution", () => {
  it("reads auspost_enabled from provider options when SiteConfig DI is unavailable", async () => {
    const provider = makeProvider({ auspost_enabled: true })
    const res = await provider.calculatePrice(
      {} as any,
      { service_code: "AUS_PARCEL_REGULAR" } as any,
      auCtx as any
    )
    expect(res.calculated_amount).toBeGreaterThan(0)
  })

  it("stays disabled (returns 0) when auspost_enabled is not provided", async () => {
    const provider = makeProvider({})
    const res = await provider.calculatePrice(
      {} as any,
      { service_code: "AUS_PARCEL_REGULAR" } as any,
      auCtx as any
    )
    expect(res.calculated_amount).toBe(0)
  })
})
