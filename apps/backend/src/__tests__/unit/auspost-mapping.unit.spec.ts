import {
  allocateCover,
  applyDiscount,
  boxesToPacRequests,
  computeOptions,
  parseSurcharges,
  PAC_COVER_CAP_BASE_AUD,
  PAC_COVER_CAP_SOD_AUD,
  quoteService,
  serviceDisplayName,
  type RateOptions,
} from "../../modules/auspost/mapping"
import { StubAusPostPacClient } from "../../modules/auspost/stub"
import type { PackedBox } from "../../modules/shipping-common/packing"
import type { PacPostageResult } from "../../modules/auspost/types"

const STD_OPTS: RateOptions = {
  coverThresholdAud: 200,
  sodTriggerAud: 300,
  discountPctStandard: 0,
  discountPctExpress: 0,
}

const ONE_LARGE_BOX: PackedBox = { weightG: 5200, lengthCm: 39, widthCm: 28, heightCm: 14 }
const TWO_BOXES: PackedBox[] = [
  { weightG: 8200, lengthCm: 39, widthCm: 28, heightCm: 14 },
  { weightG: 2200, lengthCm: 24, widthCm: 19, heightCm: 12 },
]

describe("auspost mapping", () => {
  describe("applyDiscount", () => {
    it("returns base when pct is 0 or negative", () => {
      expect(applyDiscount(1505, 0)).toBe(1505)
      expect(applyDiscount(1505, -10)).toBe(1505)
    })
    it("clamps at 95%", () => {
      expect(applyDiscount(1000, 99)).toBe(50)
    })
    it("rounds to nearest cent", () => {
      expect(applyDiscount(1505, 10)).toBe(Math.round(1505 * 0.9))
    })
  })

  describe("allocateCover", () => {
    it("returns zeros when totalCover <= 0", () => {
      expect(allocateCover(TWO_BOXES, 0, 500)).toEqual([0, 0])
    })
    it("splits proportional to weight share", () => {
      const out = allocateCover(TWO_BOXES, 250, 500)
      expect(out[0] + out[1]).toBe(250)
      // Heavier box gets more cover
      expect(out[0]).toBeGreaterThan(out[1])
    })
    it("respects per-box cap", () => {
      const out = allocateCover(TWO_BOXES, 1000, 200)
      expect(out[0]).toBeLessThanOrEqual(200)
      expect(out[1]).toBeLessThanOrEqual(200)
    })
  })

  describe("computeOptions", () => {
    it("no cover, no SOD when subtotal below threshold", () => {
      const out = computeOptions(150, [ONE_LARGE_BOX], STD_OPTS)
      expect(out.optionCodes).toEqual([])
      expect(out.sodAdded).toBe(false)
      expect(out.perBoxCover).toEqual([0])
    })
    it("adds Extra Cover when subtotal >= threshold but below SOD trigger", () => {
      const out = computeOptions(250, [ONE_LARGE_BOX], STD_OPTS)
      expect(out.optionCodes).toContain("AUS_SERVICE_OPTION_EXTRA_COVER")
      expect(out.optionCodes).not.toContain("AUS_SERVICE_OPTION_SIGNATURE_ON_DELIVERY")
      expect(out.sodAdded).toBe(false)
      expect(out.perBoxCover[0]).toBeGreaterThan(0)
    })
    it("adds SOD AND Extra Cover when subtotal exceeds SOD trigger", () => {
      const out = computeOptions(400, [ONE_LARGE_BOX], STD_OPTS)
      expect(out.optionCodes).toContain("AUS_SERVICE_OPTION_SIGNATURE_ON_DELIVERY")
      expect(out.optionCodes).toContain("AUS_SERVICE_OPTION_EXTRA_COVER")
      expect(out.sodAdded).toBe(true)
    })
    it("does NOT add SOD at exactly the trigger value (boundary: trigger is exclusive)", () => {
      const out = computeOptions(300, [ONE_LARGE_BOX], STD_OPTS)
      expect(out.sodAdded).toBe(false)
    })
    it("forceSod=true adds SOD even when subtotal is below trigger", () => {
      const out = computeOptions(50, [ONE_LARGE_BOX], STD_OPTS, true)
      expect(out.sodAdded).toBe(true)
      expect(out.optionCodes).toContain("AUS_SERVICE_OPTION_SIGNATURE_ON_DELIVERY")
      // Cover engaged because SOD lifts cap
      expect(out.optionCodes).toContain("AUS_SERVICE_OPTION_EXTRA_COVER")
      expect(out.perBoxCover[0]).toBeGreaterThan(0)
    })
    it("forceSod=true with subtotal=0 still works (covers minimal value)", () => {
      const out = computeOptions(0, [ONE_LARGE_BOX], STD_OPTS, true)
      expect(out.sodAdded).toBe(true)
    })
    it("cap is BASE when no SOD, SOD when SOD added", () => {
      const noSod = computeOptions(250, [ONE_LARGE_BOX], STD_OPTS)
      expect(noSod.perBoxCover[0]).toBeLessThanOrEqual(PAC_COVER_CAP_BASE_AUD)
      const withSod = computeOptions(8000, [ONE_LARGE_BOX], STD_OPTS)
      expect(withSod.perBoxCover[0]).toBeLessThanOrEqual(PAC_COVER_CAP_SOD_AUD)
      expect(withSod.perBoxCover[0]).toBeGreaterThan(PAC_COVER_CAP_BASE_AUD)
    })
  })

  describe("boxesToPacRequests", () => {
    it("emits one request per box with correct kg conversion", () => {
      const reqs = boxesToPacRequests({
        packedBoxes: TWO_BOXES,
        fromPostcode: "3037",
        toPostcode: "2000",
        serviceCode: "AUS_PARCEL_REGULAR",
        perBoxCover: [200, 50],
        optionCodes: ["AUS_SERVICE_OPTION_EXTRA_COVER"],
      })
      expect(reqs).toHaveLength(2)
      expect(reqs[0].weightKg).toBeCloseTo(8.2)
      expect(reqs[0].extraCover).toBe(200)
      expect(reqs[1].weightKg).toBeCloseTo(2.2)
      expect(reqs[1].extraCover).toBe(50)
      expect(reqs[0].optionCode).toEqual(["AUS_SERVICE_OPTION_EXTRA_COVER"])
    })
    it("omits extraCover when 0", () => {
      const reqs = boxesToPacRequests({
        packedBoxes: [ONE_LARGE_BOX],
        fromPostcode: "3037",
        toPostcode: "2000",
        serviceCode: "AUS_PARCEL_REGULAR",
        perBoxCover: [0],
        optionCodes: [],
      })
      expect(reqs[0].extraCover).toBeUndefined()
      expect(reqs[0].optionCode).toBeUndefined()
    })
  })

  describe("parseSurcharges", () => {
    it("splits base from SOD + Extra Cover", () => {
      const result: PacPostageResult = {
        service: "Parcel Post",
        total_cost: "18.55",
        costs: {
          cost: [
            { item: "Parcel Post", cost: "15.05" },
            { item: "Signature on Delivery", cost: "1.50" },
            { item: "Extra cover", cost: "2.00" },
          ],
        },
      }
      const out = parseSurcharges(result)
      expect(out.base_cents).toBe(1505)
      expect(out.surcharges_cents).toBe(150 + 200)
    })

    it("falls back to total when no costs[]", () => {
      const result: PacPostageResult = {
        service: "Parcel Post",
        total_cost: "15.05",
      }
      const out = parseSurcharges(result)
      expect(out.base_cents).toBe(1505)
      expect(out.surcharges_cents).toBe(0)
    })
  })

  describe("quoteService (integration with stub client)", () => {
    it("computes per-box totals and applies discount to base only", async () => {
      const client = new StubAusPostPacClient()
      const quote = await quoteService({
        client,
        packedBoxes: TWO_BOXES,
        fromPostcode: "3037",
        toPostcode: "2000",
        serviceCode: "AUS_PARCEL_REGULAR",
        cartSubtotalAud: 250,
        opts: { ...STD_OPTS, discountPctStandard: 10 },
      })
      expect(quote.per_box).toHaveLength(2)
      // discount 10% on base, surcharges pass-through
      const expectedDiscountedBase = Math.round(quote.base_total_cents * 0.9)
      expect(quote.customer_total_cents).toBe(expectedDiscountedBase + quote.surcharges_total_cents)
      expect(quote.rrp_total_cents).toBe(quote.base_total_cents + quote.surcharges_total_cents)
    })

    it("triggers SOD when subtotal > 300 and applies cover", async () => {
      const client = new StubAusPostPacClient()
      const quote = await quoteService({
        client,
        packedBoxes: [ONE_LARGE_BOX],
        fromPostcode: "3037",
        toPostcode: "2000",
        serviceCode: "AUS_PARCEL_EXPRESS",
        cartSubtotalAud: 1500,
        opts: STD_OPTS,
      })
      expect(quote.sod_added).toBe(true)
      expect(quote.cover_total_aud).toBeGreaterThan(0)
      expect(quote.surcharges_total_cents).toBeGreaterThan(0)
    })
  })

  describe("serviceDisplayName", () => {
    it("renders branded names", () => {
      expect(serviceDisplayName("AUS_PARCEL_REGULAR")).toBe("Australia Post - Standard")
      expect(serviceDisplayName("AUS_PARCEL_EXPRESS")).toBe("Australia Post - Express")
    })
  })
})
