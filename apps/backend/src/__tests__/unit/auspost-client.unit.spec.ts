import { AusPostPacClient } from "../../modules/auspost/client"
import { PacApiError } from "../../modules/auspost/types"

describe("AusPostPacClient", () => {
  it("requires an apiKey", () => {
    expect(() => new AusPostPacClient({ apiKey: "" })).toThrow(/apiKey/)
  })

  it("listServices sends AUTH-KEY header and parses services", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          services: {
            service: [
              { code: "AUS_PARCEL_REGULAR", name: "Parcel Post", price: "15.05", max_extra_cover: 500 },
              { code: "AUS_PARCEL_EXPRESS", name: "Express Post", price: "23.80", max_extra_cover: 500 },
            ],
          },
        }),
    })
    const client = new AusPostPacClient({ apiKey: "test-key", fetchImpl: fetchMock as unknown as typeof fetch })
    const services = await client.listServices({
      fromPostcode: "2000",
      toPostcode: "3000",
      lengthCm: 22,
      widthCm: 16,
      heightCm: 7,
      weightKg: 1.5,
    })
    expect(services).toHaveLength(2)
    expect(services[0].code).toBe("AUS_PARCEL_REGULAR")
    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain("from_postcode=2000")
    expect(url).toContain("to_postcode=3000")
    expect(url).toContain("weight=1.5")
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toMatchObject({ "AUTH-KEY": "test-key" })
  })

  it("listServices handles single-service shape (object not array)", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          services: { service: { code: "AUS_PARCEL_REGULAR", name: "Parcel Post", price: "11.00" } },
        }),
    })
    const client = new AusPostPacClient({ apiKey: "k", fetchImpl: fetchMock as unknown as typeof fetch })
    const services = await client.listServices({
      fromPostcode: "2000",
      toPostcode: "3000",
      lengthCm: 22,
      widthCm: 16,
      heightCm: 7,
      weightKg: 1.5,
    })
    expect(services).toHaveLength(1)
    expect(services[0].price).toBe("11.00")
  })

  it("calculate returns postage_result and includes option_code in query", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          postage_result: {
            service: "Parcel Post",
            delivery_time: "Delivered in 4 business days",
            total_cost: "16.55",
            costs: {
              cost: [
                { item: "Parcel Post", cost: "15.05" },
                { item: "Signature on Delivery", cost: "1.50" },
              ],
            },
          },
        }),
    })
    const client = new AusPostPacClient({ apiKey: "k", fetchImpl: fetchMock as unknown as typeof fetch })
    const result = await client.calculate({
      fromPostcode: "2000",
      toPostcode: "3000",
      lengthCm: 22,
      widthCm: 16,
      heightCm: 7,
      weightKg: 1.5,
      serviceCode: "AUS_PARCEL_REGULAR",
      optionCode: ["AUS_SERVICE_OPTION_SIGNATURE_ON_DELIVERY", "AUS_SERVICE_OPTION_EXTRA_COVER"],
      extraCover: 250,
    })
    expect(result.total_cost).toBe("16.55")
    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain("service_code=AUS_PARCEL_REGULAR")
    expect(url).toContain("option_code=AUS_SERVICE_OPTION_SIGNATURE_ON_DELIVERY")
    expect(url).toContain("option_code=AUS_SERVICE_OPTION_EXTRA_COVER")
    expect(url).toContain("extra_cover=250")
  })

  it("throws PacApiError on HTTP error", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: async () =>
        JSON.stringify({ error: { errorMessage: "Weight exceeds 22kg", errorCode: "OUT_OF_RANGE" } }),
    })
    const client = new AusPostPacClient({ apiKey: "k", fetchImpl: fetchMock as unknown as typeof fetch })
    await expect(
      client.listServices({
        fromPostcode: "2000",
        toPostcode: "3000",
        lengthCm: 22,
        widthCm: 16,
        heightCm: 7,
        weightKg: 30,
      }),
    ).rejects.toBeInstanceOf(PacApiError)
  })

  it("throws PacApiError on inline 200-with-error body", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({ error: { errorMessage: "Postcode not found", errorCode: "NOT_FOUND" } }),
    })
    const client = new AusPostPacClient({ apiKey: "k", fetchImpl: fetchMock as unknown as typeof fetch })
    await expect(
      client.listServices({
        fromPostcode: "2000",
        toPostcode: "9999",
        lengthCm: 22,
        widthCm: 16,
        heightCm: 7,
        weightKg: 1.5,
      }),
    ).rejects.toThrow(/Postcode not found/)
  })
})
