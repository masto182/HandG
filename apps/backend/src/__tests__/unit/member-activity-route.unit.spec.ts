import { GET } from "../../api/admin/members/[id]/activity/route"

describe("GET /admin/members/:id/activity", () => {
  it("requests bounded member activity events and preserves the member id", async () => {
    const listMemberActivityEvents = jest.fn().mockResolvedValue([])
    const getLastActiveByCustomerIds = jest.fn().mockResolvedValue(new Map())
    const json = jest.fn()

    const now = Date.now()
    await GET(
      {
        params: { id: "cust_123" },
        scope: {
          resolve: () => ({ listMemberActivityEvents, getLastActiveByCustomerIds }),
        },
      } as any,
      { json } as any
    )

    expect(listMemberActivityEvents).toHaveBeenCalledWith(
      "cust_123",
      expect.objectContaining({
        eventTypes: expect.arrayContaining([
          "product.viewed",
          "checkout.step_reached",
          "order.completed",
        ]),
        directLimit: 500,
        sessionLimit: 1000,
      })
    )

    const since = listMemberActivityEvents.mock.calls[0][1].since
    expect(since).toBeInstanceOf(Date)
    expect(now - since.getTime()).toBeGreaterThanOrEqual(89 * 24 * 60 * 60 * 1000)
    expect(now - since.getTime()).toBeLessThanOrEqual(91 * 24 * 60 * 60 * 1000)
    expect(getLastActiveByCustomerIds).toHaveBeenCalledWith(["cust_123"])
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        activity: expect.objectContaining({
          summary: expect.objectContaining({
            sessions: 0,
            completed_orders: 0,
          }),
          last_active: null,
        }),
      })
    )
  })
})
