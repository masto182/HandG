import {
  addBusinessDays,
  estimateDeliveryRange,
  isAramexAllowedForState,
  nextDispatchDate,
  normaliseAuState,
  resolveDispatchDays,
  resolveExtraTransitDays,
} from "../../modules/shipping-common/dispatch"

const ARAMEX = [1, 2]
const AUSPOST = [1, 2, 3]

describe("shipping-common dispatch", () => {
  describe("state handling", () => {
    it.each([
      ["NSW", "NSW"],
      ["nsw", "NSW"],
      ["au-nsw", "NSW"],
      ["New South Wales", "NSW"],
      ["South Australia", "SA"],
      [" vic ", "VIC"],
    ])("normalises %s to %s", (input, expected) => {
      expect(normaliseAuState(input)).toBe(expected)
    })

    it("allows only NSW, VIC and SA by default", () => {
      for (const s of ["NSW", "VIC", "SA", "au-vic"]) {
        expect(isAramexAllowedForState(s, undefined)).toBe(true)
      }
      for (const s of ["QLD", "WA", "TAS", "NT", "ACT", "", null, undefined]) {
        expect(isAramexAllowedForState(s as string | null | undefined, undefined)).toBe(false)
      }
    })

    it("honours a custom allowed list", () => {
      expect(isAramexAllowedForState("QLD", ["QLD"])).toBe(true)
      expect(isAramexAllowedForState("NSW", ["QLD"])).toBe(false)
    })
  })

  describe("resolveDispatchDays", () => {
    it("uses the defaults and falls back to weekdays", () => {
      expect(resolveDispatchDays("aramex", undefined)).toEqual([1, 2])
      expect(resolveDispatchDays("australia_post", undefined)).toEqual([1, 2, 3])
      expect(resolveDispatchDays("couriers_please", undefined)).toEqual([1, 2])
      expect(resolveDispatchDays("other", undefined)).toEqual([1, 2, 3, 4, 5])
    })

    it("lets config override a group", () => {
      expect(resolveDispatchDays("aramex", { aramex: [1] })).toEqual([1])
    })
  })

  describe("nextDispatchDate (next dispatch day strictly after the order date, Sydney time)", () => {
    it("Sunday order ships Monday", () => {
      expect(nextDispatchDate(new Date("2026-11-22T03:00:00Z"), ARAMEX)).toBe("2026-11-23")
    })

    it("Monday order ships Tuesday for Aramex", () => {
      expect(nextDispatchDate(new Date("2026-11-23T01:00:00Z"), ARAMEX)).toBe("2026-11-24")
    })

    it("Tuesday order ships next Monday for Aramex, Wednesday for Australia Post", () => {
      const tue = new Date("2026-11-24T01:00:00Z")
      expect(nextDispatchDate(tue, ARAMEX)).toBe("2026-11-30")
      expect(nextDispatchDate(tue, AUSPOST)).toBe("2026-11-25")
    })

    it("Wednesday order ships next Monday for Australia Post", () => {
      expect(nextDispatchDate(new Date("2026-11-25T01:00:00Z"), AUSPOST)).toBe("2026-11-30")
    })

    it("Friday order ships next Monday", () => {
      expect(nextDispatchDate(new Date("2026-11-27T01:00:00Z"), AUSPOST)).toBe("2026-11-30")
    })

    it("uses the Sydney date, not UTC (Tue 01:00 Sydney is still Monday in UTC)", () => {
      const justAfterSydneyMidnight = new Date("2026-11-23T14:00:00Z")
      expect(nextDispatchDate(justAfterSydneyMidnight, ARAMEX)).toBe("2026-11-30")
    })

    it("crosses a year boundary", () => {
      expect(nextDispatchDate(new Date("2026-12-31T01:00:00Z"), AUSPOST)).toBe("2027-01-04")
    })
  })

  describe("full-week dispatch rules", () => {
    const orderDays = [
      "2026-11-23", // Mon
      "2026-11-24", // Tue
      "2026-11-25", // Wed
      "2026-11-26", // Thu
      "2026-11-27", // Fri
      "2026-11-28", // Sat
      "2026-11-29", // Sun
    ]
    const at = (day: string) => new Date(`${day}T01:00:00Z`) // noon Sydney (AEDT)

    it("Aramex: Monday ships Tuesday, Tuesday to Sunday ship the following Monday", () => {
      const expected = [
        "2026-11-24",
        "2026-11-30",
        "2026-11-30",
        "2026-11-30",
        "2026-11-30",
        "2026-11-30",
        "2026-11-30",
      ]
      expect(orderDays.map((d) => nextDispatchDate(at(d), ARAMEX))).toEqual(expected)
    })

    it("Australia Post: Monday ships Tuesday, Tuesday ships Wednesday, Wednesday to Sunday ship Monday", () => {
      const expected = [
        "2026-11-24",
        "2026-11-25",
        "2026-11-30",
        "2026-11-30",
        "2026-11-30",
        "2026-11-30",
        "2026-11-30",
      ]
      expect(orderDays.map((d) => nextDispatchDate(at(d), AUSPOST))).toEqual(expected)
    })
  })

  describe("extra transit days", () => {
    it("adds one day for Aramex by default and nothing for other carriers", () => {
      expect(resolveExtraTransitDays("aramex", undefined)).toBe(1)
      expect(resolveExtraTransitDays("australia_post", undefined)).toBe(0)
      expect(resolveExtraTransitDays("couriers_please", undefined)).toBe(0)
    })

    it("lets config override", () => {
      expect(resolveExtraTransitDays("aramex", { aramex: 0 })).toBe(0)
      expect(resolveExtraTransitDays("couriers_please", { couriers_please: 2 })).toBe(2)
    })

    it("shifts the Aramex delivery range a business day later than the same transit without it", () => {
      expect(estimateDeliveryRange("2026-11-24", 4)).toEqual({
        earliest: "2026-11-27",
        latest: "2026-12-01",
      })
      expect(estimateDeliveryRange("2026-11-24", 4 + 1)).toEqual({
        earliest: "2026-11-30",
        latest: "2026-12-02",
      })
    })
  })

  describe("delivery range", () => {
    it("skips weekends when adding business days", () => {
      expect(addBusinessDays("2026-11-27", 1)).toBe("2026-11-30")
      expect(addBusinessDays("2026-11-30", 3)).toBe("2026-12-03")
    })

    it("returns days-1 .. days+1 business days from dispatch", () => {
      expect(estimateDeliveryRange("2026-11-30", 4)).toEqual({
        earliest: "2026-12-03",
        latest: "2026-12-07",
      })
      expect(estimateDeliveryRange("2026-11-30", 1)).toEqual({
        earliest: "2026-12-01",
        latest: "2026-12-02",
      })
    })
  })
})
