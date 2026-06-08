jest.mock("@lib/config", () => ({
  sdk: {
    client: {
      fetch: jest.fn(),
    },
  },
}))

// `cache` is a React server API — mock it to be transparent in unit tests.
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  cache: (fn: unknown) => fn,
}))

import { sdk } from "@lib/config"
import { getBeerDetail } from "./beer-detail"

const mockFetch = sdk.client.fetch as jest.MockedFunction<
  typeof sdk.client.fetch
>

describe("lib/data/beer-detail", () => {
  beforeEach(() => mockFetch.mockReset())

  it("returns hop_provenance + untappd_rating when both are present", async () => {
    mockFetch.mockResolvedValueOnce({
      beer_detail: {
        hop_provenance: "Eggers Riwaka, Freestyle Nelson Sauvin SubZero",
        untappd_rating: 4.2,
      },
    } as any)
    const result = await getBeerDetail("prod-1")
    expect(result?.hop_provenance).toBe(
      "Eggers Riwaka, Freestyle Nelson Sauvin SubZero",
    )
    expect(result?.untappd_rating).toBe(4.2)
  })

  it("returns null hop_provenance when not set", async () => {
    mockFetch.mockResolvedValueOnce({
      beer_detail: { hop_provenance: null, untappd_rating: null },
    } as any)
    const result = await getBeerDetail("prod-2")
    expect(result?.hop_provenance).toBeNull()
    expect(result?.untappd_rating).toBeNull()
  })

  it("returns null when beer_detail is null (no record yet)", async () => {
    mockFetch.mockResolvedValueOnce({ beer_detail: null } as any)
    expect(await getBeerDetail("prod-3")).toBeNull()
  })

  it("returns null when beer_detail key is absent", async () => {
    mockFetch.mockResolvedValueOnce({} as any)
    expect(await getBeerDetail("prod-4")).toBeNull()
  })

  it("returns null when the fetch throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network error"))
    expect(await getBeerDetail("prod-5")).toBeNull()
  })
})
