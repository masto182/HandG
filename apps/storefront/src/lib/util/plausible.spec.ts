import { trackGoal } from "./plausible"

describe("trackGoal", () => {
  beforeEach(() => {
    delete (window as any).plausible
  })

  it("is a no-op when window.plausible is missing", () => {
    expect(() => trackGoal("search", { q: "ipa" })).not.toThrow()
  })

  it("calls window.plausible with name + props", () => {
    const spy = jest.fn()
    ;(window as any).plausible = spy
    trackGoal("application_submitted", { has_referral: true })
    expect(spy).toHaveBeenCalledWith("application_submitted", {
      props: { has_referral: true },
    })
  })

  it("calls window.plausible without options when no props", () => {
    const spy = jest.fn()
    ;(window as any).plausible = spy
    trackGoal("order_placed")
    expect(spy).toHaveBeenCalledWith("order_placed", undefined)
  })
})
