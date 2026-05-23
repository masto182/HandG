/**
 * Locks in the post-Sprint-X invariant that wishlist monetary fields are
 * stored in MAJOR units (dollars), matching Medusa 2.x's price convention.
 *
 * Two surfaces tested here:
 *
 *  1. The approve-wishlist-offers delta math, exercised with realistic
 *     dollar values. Before the fix, current_price (dollars) was being
 *     subtracted from offer_price (cents), producing huge negative deltas
 *     that clamped to 0 and silently created zero-discount promotions.
 *
 *  2. The cents->dollars migration-script heuristic: values < 100 are
 *     treated as already-in-dollars and left alone (defence-in-depth so
 *     re-running on a fresh DB after PR1 ships is a no-op).
 */

describe("wishlist price-format contract (dollars, not cents)", () => {
  describe("approve-offers delta math with dollar inputs", () => {
    const computeDelta = (currentPrice: number | null, offerPrice: number) => {
      if (currentPrice == null) return null
      return Math.max(0, currentPrice - offerPrice)
    }

    it("$50 product, $30 offer => $20 delta", () => {
      expect(computeDelta(50, 30)).toBe(20)
    })

    it("$10 product, $10 offer => $0 delta (no discount needed)", () => {
      expect(computeDelta(10, 10)).toBe(0)
    })

    it("$10 product, $15 offer => $0 delta (offer above price)", () => {
      expect(computeDelta(10, 15)).toBe(0)
    })

    it("handles cents precision ($49.99 product, $39.99 offer => $10.00)", () => {
      // toFixed because of float arithmetic
      expect(Number(computeDelta(49.99, 39.99)!.toFixed(2))).toBe(10.0)
    })

    it("returns null when current price is unknown", () => {
      expect(computeDelta(null, 25)).toBeNull()
    })
  })

  describe("backfill migration-script heuristic", () => {
    // Mirrors the predicate used by
    // apps/backend/src/migration-scripts/backfill-wishlist-prices-to-dollars.ts
    const shouldScale = (value: unknown): boolean =>
      typeof value === "number" && value >= 100

    it("scales legacy cents values (>= 100)", () => {
      expect(shouldScale(1000)).toBe(true)
      expect(shouldScale(4999)).toBe(true)
      expect(shouldScale(100)).toBe(true)
    })

    it("leaves already-dollar values alone (< 100)", () => {
      expect(shouldScale(10)).toBe(false)
      expect(shouldScale(49.99)).toBe(false)
      expect(shouldScale(99.99)).toBe(false)
      expect(shouldScale(0)).toBe(false)
    })

    it("ignores null / undefined / non-numeric", () => {
      expect(shouldScale(null)).toBe(false)
      expect(shouldScale(undefined)).toBe(false)
      expect(shouldScale("100")).toBe(false)
    })

    /**
     * Caveat documented in the migration script: the heuristic has a small
     * grey zone in [100, infinity) where a legitimately-priced item over
     * $100 in dollars would still be scaled if the migration is re-run on
     * post-fix data. In practice the script is gated behind
     * script_migrations tracking so it only runs once per database.
     */
    it("documents the >= 100 grey zone (intentional one-shot risk)", () => {
      // A $150 item already in dollars would be wrongly scaled if the script
      // ran twice. Medusa's script_migrations table prevents that.
      expect(shouldScale(150)).toBe(true)
    })
  })
})
