import {
  schedulePickupForFulfillments,
  cancelPickup,
  listPickupsForCarrier,
  PickupIneligibleError,
} from "../../modules/shipengine/pickups"
import { resetShipEngineClientCache } from "../../modules/shipengine/factory"

describe("ShipEngine pickup scheduling (stub client)", () => {
  const originalKey = process.env.SHIPENGINE_API_KEY

  beforeEach(() => {
    delete process.env.SHIPENGINE_API_KEY
    resetShipEngineClientCache()
  })

  afterAll(() => {
    if (originalKey) process.env.SHIPENGINE_API_KEY = originalKey
    resetShipEngineClientCache()
  })

  it("throws PickupIneligibleError when a fulfillment has no label_id/carrier_id", async () => {
    await expect(schedulePickupForFulfillments([{ id: "ful_1", data: {} }])).rejects.toThrow(
      PickupIneligibleError
    )
  })

  it("throws PickupIneligibleError when fulfillments span multiple carriers", async () => {
    await expect(
      schedulePickupForFulfillments([
        { id: "ful_1", data: { carrier_id: "se-stub-auspost", label_id: "lbl_1" } },
        { id: "ful_2", data: { carrier_id: "se-stub-couriersplease", label_id: "lbl_2" } },
      ])
    ).rejects.toThrow(PickupIneligibleError)
  })

  it("schedules a pickup for a single eligible fulfillment using default availability window", async () => {
    const pickup = await schedulePickupForFulfillments([
      { id: "ful_1", data: { carrier_id: "se-stub-auspost", label_id: "lbl_1" } },
    ])
    expect(pickup.pickup_id).toMatch(/^stub-pickup-/)
    expect(pickup.carrier_id).toBe("se-stub-auspost")
    expect(pickup.label_ids).toEqual(["lbl_1"])
    expect(pickup.pickup_window.start_at).toBeTruthy()
    expect(pickup.confirmation_numbers?.length).toBeGreaterThan(0)
  })

  it("schedules a pickup covering multiple fulfillments sharing one carrier", async () => {
    const pickup = await schedulePickupForFulfillments([
      { id: "ful_1", data: { carrier_id: "se-stub-auspost", label_id: "lbl_1" } },
      { id: "ful_2", data: { carrier_id: "se-stub-auspost", label_id: "lbl_2" } },
    ])
    expect(pickup.label_ids).toEqual(["lbl_1", "lbl_2"])
  })

  it("respects an explicit pickup_window when provided", async () => {
    const window = { start_at: "2026-09-01T09:00:00Z", end_at: "2026-09-01T17:00:00Z" }
    const pickup = await schedulePickupForFulfillments(
      [{ id: "ful_1", data: { carrier_id: "se-stub-auspost", label_id: "lbl_1" } }],
      window
    )
    expect(pickup.pickup_window).toEqual(window)
  })

  it("lists and cancels scheduled pickups via the stub", async () => {
    const pickup = await schedulePickupForFulfillments([
      { id: "ful_1", data: { carrier_id: "se-stub-auspost", label_id: "lbl_1" } },
    ])
    const listed = await listPickupsForCarrier("se-stub-auspost")
    expect(listed.some((p) => p.pickup_id === pickup.pickup_id)).toBe(true)

    const result = await cancelPickup(pickup.pickup_id)
    expect(result.approved).toBe(true)

    const afterCancel = await listPickupsForCarrier("se-stub-auspost")
    expect(afterCancel.some((p) => p.pickup_id === pickup.pickup_id)).toBe(false)
  })

  it("cancelling an unknown pickup_id is tolerated (idempotent)", async () => {
    const result = await cancelPickup("stub-pickup-does-not-exist")
    expect(result.approved).toBe(true)
  })
})
