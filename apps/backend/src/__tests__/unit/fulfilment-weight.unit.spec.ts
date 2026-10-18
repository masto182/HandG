import {
  packItems,
  packableItemsFromFulfillmentItems,
  resolveWeightsBySku,
  CONTAINER_WEIGHTS,
  BOX_TARE_G,
} from "../../modules/shipping-common/packing"

/**
 * packableItemsFromFulfillmentItems calls resolveWeightsBySku which hits
 * Postgres.  In unit tests DATABASE_URL is unset so the resolver returns an
 * empty map and the function falls back to container-type defaults (550g for
 * cans because resolveContainerType(null) -> "can").
 *
 * We test the DB-backed path via integration / manually; these unit tests
 * verify the fallback chain and the overall packing correctness.
 */

describe("packableItemsFromFulfillmentItems", () => {
  it("falls back to can weight when no DB and no variant data", async () => {
    const items = [
      { sku: "some-can", quantity: 2 },
      { sku: "another-can", quantity: 1 },
    ]
    const result = await packableItemsFromFulfillmentItems(items, 750)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ quantity: 2, weightG: CONTAINER_WEIGHTS.can, containerType: "can" })
    expect(result[1]).toEqual({ quantity: 1, weightG: CONTAINER_WEIGHTS.can, containerType: "can" })
  })

  it("handles items with no sku", async () => {
    const items = [{ quantity: 1 }, { sku: null, quantity: 1 }]
    const result = await packableItemsFromFulfillmentItems(items, 750)
    expect(result).toHaveLength(2)
    expect(result[0].weightG).toBe(CONTAINER_WEIGHTS.can)
    expect(result[1].weightG).toBe(CONTAINER_WEIGHTS.can)
  })

  it("handles empty items array", async () => {
    const result = await packableItemsFromFulfillmentItems([], 750)
    expect(result).toEqual([])
  })

  it("parses string quantities", async () => {
    const result = await packableItemsFromFulfillmentItems([{ sku: "x", quantity: "3" }], 750)
    expect(result[0].quantity).toBe(3)
  })
})

describe("resolveWeightsBySku", () => {
  it("returns empty map when DATABASE_URL is unset (test env)", async () => {
    const map = await resolveWeightsBySku(["sku-1", "sku-2"])
    expect(map.size).toBe(0)
  })

  it("returns empty map for empty input", async () => {
    const map = await resolveWeightsBySku([])
    expect(map.size).toBe(0)
  })
})

describe("order 40 regression: fulfilment weight with correct data", () => {
  // Simulates what SHOULD happen when resolveWeightsBySku returns real data.
  // Order 40: 10 cans (550g) + 5 crowlers (1150g) = 11250g + 200g tare = 11450g
  // (The DB sums to 11850g because 14th Anniversary Stout x2 weighs 1100g not
  //  1 can; the per-variant weights differ slightly from container defaults.)
  it("packs correctly with mixed cans and crowlers at real weights", () => {
    const items = [
      { quantity: 2, weightG: 550, containerType: "can" as const }, // 14th Anniversary Stout
      { quantity: 1, weightG: 1150, containerType: "crowler" as const }, // As the Hammer Drops
      { quantity: 1, weightG: 550, containerType: "can" as const }, // Captain Asian America
      { quantity: 1, weightG: 1150, containerType: "crowler" as const }, // Dead Stock Throwback
      { quantity: 1, weightG: 550, containerType: "can" as const }, // Don't Pho With the Reaper
      { quantity: 1, weightG: 550, containerType: "can" as const }, // Fractured
      { quantity: 1, weightG: 550, containerType: "can" as const }, // Heady Topper
      { quantity: 1, weightG: 1150, containerType: "crowler" as const }, // Keep your head down
      { quantity: 1, weightG: 550, containerType: "can" as const }, // Nuclear Mysticism
      { quantity: 1, weightG: 1150, containerType: "crowler" as const }, // Precipice of truth
      { quantity: 1, weightG: 550, containerType: "can" as const }, // Senor Murcielago
      { quantity: 1, weightG: 550, containerType: "can" as const }, // Yodel: Kohia Nelson
      { quantity: 1, weightG: 1150, containerType: "crowler" as const }, // alone again at last
      { quantity: 1, weightG: 1150, containerType: "crowler" as const }, // feeding on carrion (crowler in DB: 1150g not 550g)
    ]

    const boxes = packItems(items)
    expect(boxes).toHaveLength(1) // 15 units < 16 max
    // 10*550 + 5*1150 + 200 tare = 5500 + 5750 + 200 = 11450
    // But actual DB weights: 14th Anniv = 550 each (variant weight), crowlers = 1150 each
    const totalWeight = items.reduce((s, i) => s + i.weightG * i.quantity, 0) + BOX_TARE_G
    // 2*550 + 6*1150 + 7*550 + 200 tare = 1100 + 6900 + 3850 + 200 = 12050
    expect(totalWeight).toBe(12050)
    expect(boxes[0].weightG).toBe(totalWeight)
    expect(boxes[0].lengthCm).toBe(39) // forced to large because crowlers present
  })

  // The BUG: with FulfillmentItemDTO (no variant data), all 15 items default to 550g
  it("reproduces the bug: all items defaulting to can weight", () => {
    const buggyItems = Array.from({ length: 14 }, () => ({
      quantity: 1,
      weightG: CONTAINER_WEIGHTS.can, // 550g - the wrong default for crowlers
      containerType: "can" as const,
    }))
    buggyItems[0].quantity = 2 // 14th Anniversary x2
    // Total: 15 * 550 + 200 = 8450 - matches the stored buggy value
    const boxes = packItems(buggyItems)
    const totalWeight = buggyItems.reduce((s, i) => s + i.weightG * i.quantity, 0) + BOX_TARE_G
    expect(totalWeight).toBe(8450) // confirms the bug math
  })
})
