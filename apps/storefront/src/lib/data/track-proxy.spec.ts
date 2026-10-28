const fetchMock = jest.fn()
const authMock = jest.fn()

jest.mock("@lib/config", () => ({
  sdk: { client: { fetch: (...a: unknown[]) => fetchMock(...a) } },
}))
jest.mock("@lib/data/cookies", () => ({ getAuthHeaders: () => authMock() }))

import { forwardTrack } from "./track-proxy"

describe("forwardTrack", () => {
  it("forwards the bearer token when logged in", async () => {
    authMock.mockResolvedValue({ authorization: "Bearer t" })
    fetchMock.mockResolvedValue({})
    await forwardTrack("/store/events", { a: 1 })
    expect(fetchMock).toHaveBeenCalledWith("/store/events", {
      method: "POST",
      headers: { authorization: "Bearer t" },
      body: { a: 1 },
    })
  })

  it("sends anonymously when logged out", async () => {
    authMock.mockResolvedValue({})
    fetchMock.mockResolvedValue({})
    await forwardTrack("/store/sessions/heartbeat", { s: 1 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][1].headers).toEqual({})
  })

  it("retries anonymously when the token is rejected", async () => {
    authMock.mockResolvedValue({ authorization: "Bearer stale" })
    fetchMock.mockRejectedValueOnce({ status: 401 }).mockResolvedValueOnce({})
    await forwardTrack("/store/events", {})
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][1].headers).toEqual({})
  })

  it("swallows other errors without retrying", async () => {
    authMock.mockResolvedValue({ authorization: "Bearer t" })
    fetchMock.mockRejectedValueOnce({ status: 500 })
    await expect(forwardTrack("/store/events", {})).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
