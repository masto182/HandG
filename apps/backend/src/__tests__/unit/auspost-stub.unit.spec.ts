import { StubAusPostPacClient } from "../../modules/auspost/stub"

describe("StubAusPostPacClient", () => {
  it("returns deterministic services for any rate request", async () => {
    const client = new StubAusPostPacClient()
    const services = await client.listServices({
      fromPostcode: "2000",
      toPostcode: "3000",
      lengthCm: 22,
      widthCm: 16,
      heightCm: 7,
      weightKg: 1.5,
    })
    expect(services).toHaveLength(2)
    expect(services.map((s) => s.code).sort()).toEqual(["AUS_PARCEL_EXPRESS", "AUS_PARCEL_REGULAR"])
  })

  it("price scales with weight band", async () => {
    const client = new StubAusPostPacClient()
    const small = await client.calculate({
      fromPostcode: "2000",
      toPostcode: "3000",
      lengthCm: 22,
      widthCm: 16,
      heightCm: 7,
      weightKg: 0.4,
      serviceCode: "AUS_PARCEL_REGULAR",
    })
    const large = await client.calculate({
      fromPostcode: "2000",
      toPostcode: "3000",
      lengthCm: 39,
      widthCm: 28,
      heightCm: 14,
      weightKg: 8,
      serviceCode: "AUS_PARCEL_REGULAR",
    })
    expect(parseFloat(small.total_cost)).toBeLessThan(parseFloat(large.total_cost))
  })

  it("Express is more expensive than Regular for the same parcel", async () => {
    const client = new StubAusPostPacClient()
    const reg = await client.calculate({
      fromPostcode: "2000",
      toPostcode: "3000",
      lengthCm: 22,
      widthCm: 16,
      heightCm: 7,
      weightKg: 1.5,
      serviceCode: "AUS_PARCEL_REGULAR",
    })
    const exp = await client.calculate({
      fromPostcode: "2000",
      toPostcode: "3000",
      lengthCm: 22,
      widthCm: 16,
      heightCm: 7,
      weightKg: 1.5,
      serviceCode: "AUS_PARCEL_EXPRESS",
    })
    expect(parseFloat(exp.total_cost)).toBeGreaterThan(parseFloat(reg.total_cost))
  })

  it("includes SOD line when option is requested", async () => {
    const client = new StubAusPostPacClient()
    const result = await client.calculate({
      fromPostcode: "2000",
      toPostcode: "3000",
      lengthCm: 22,
      widthCm: 16,
      heightCm: 7,
      weightKg: 1.5,
      serviceCode: "AUS_PARCEL_REGULAR",
      optionCode: ["AUS_SERVICE_OPTION_SIGNATURE_ON_DELIVERY"],
    })
    const lines = Array.isArray(result.costs?.cost)
      ? result.costs!.cost
      : result.costs?.cost
        ? [result.costs!.cost]
        : []
    expect(lines.some((l) => l.item.toLowerCase().includes("signature"))).toBe(true)
  })

  it("includes Extra cover line when extraCover > 0", async () => {
    const client = new StubAusPostPacClient()
    const result = await client.calculate({
      fromPostcode: "2000",
      toPostcode: "3000",
      lengthCm: 22,
      widthCm: 16,
      heightCm: 7,
      weightKg: 1.5,
      serviceCode: "AUS_PARCEL_REGULAR",
      optionCode: ["AUS_SERVICE_OPTION_EXTRA_COVER"],
      extraCover: 200,
    })
    const lines = Array.isArray(result.costs?.cost)
      ? result.costs!.cost
      : result.costs?.cost
        ? [result.costs!.cost]
        : []
    expect(lines.some((l) => l.item.toLowerCase().includes("cover"))).toBe(true)
  })
})
