import { decideProgression } from "../../workflows/steps/evaluate-vip-progression"

describe("decideProgression", () => {
  it("noop when score below current tier threshold (already at approved)", () => {
    const d = decideProgression("approved", 0, false)
    expect(d).toEqual({ action: "noop" })
  })

  it("auto-promotes approved -> vip1 when score crosses 100", () => {
    const d = decideProgression("approved", 100, false)
    expect(d).toEqual({ action: "promote", newTier: "vip1", previousTier: "approved" })
  })

  it("auto-promotes vip1 -> vip2 when score crosses 250", () => {
    const d = decideProgression("vip1", 250, false)
    expect(d).toEqual({ action: "promote", newTier: "vip2", previousTier: "vip1" })
  })

  it("auto-promotes vip2 -> vip3 when score crosses 450", () => {
    const d = decideProgression("vip2", 450, false)
    expect(d).toEqual({ action: "promote", newTier: "vip3", previousTier: "vip2" })
  })

  it("auto-promotes vip3 -> vip4 when score crosses 700", () => {
    const d = decideProgression("vip3", 700, false)
    expect(d).toEqual({ action: "promote", newTier: "vip4", previousTier: "vip3" })
  })

  it("flags awaiting_vip5_approval when crossing 1000 without pre-approval", () => {
    const d = decideProgression("vip4", 1000, false)
    expect(d).toEqual({ action: "await_vip5_approval", newTier: "vip5" })
  })

  it("auto-promotes vip4 -> vip5 when pre-approved", () => {
    const d = decideProgression("vip4", 1000, true)
    expect(d).toEqual({ action: "promote", newTier: "vip5", previousTier: "vip4" })
  })

  it("noop when score doesn't reach next tier", () => {
    const d = decideProgression("vip2", 449, false)
    expect(d).toEqual({ action: "noop" })
  })

  it("noop when already at vip5 (cannot exceed)", () => {
    const d = decideProgression("vip5", 5000, false)
    expect(d).toEqual({ action: "noop" })
  })

  it("skips intermediate tiers when score qualifies for several", () => {
    // approved -> vip3 directly when score is enough for vip3 (450)
    const d = decideProgression("approved", 600, false)
    expect(d).toEqual({ action: "promote", newTier: "vip3", previousTier: "approved" })
  })
})
