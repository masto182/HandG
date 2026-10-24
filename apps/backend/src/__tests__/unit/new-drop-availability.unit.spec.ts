import {
  describeAvailability,
  formatUnlockTime,
  hasEarlierTier,
  toTier,
} from "../../lib/new-drop-availability"
import { renderEmail } from "../../lib/render-email"
import * as NewDropDigest from "../../emails/new-drop-digest"

const RELEASE = "2026-10-24T08:00:00.000Z"
const meta = { release_at: RELEASE }
const AT_RELEASE = new Date(RELEASE)

describe("new-drop availability", () => {
  it("formats unlock time in Sydney wall-clock", () => {
    expect(formatUnlockTime(new Date("2026-10-24T19:00:00.000Z"))).toBe("Sun 25 Oct, 6:00am")
  })

  it("top tiers can buy at release", () => {
    expect(describeAvailability(meta, "vip5", AT_RELEASE)).toBe("Available to you now")
  })

  it("lower tiers get their own unlock time", () => {
    expect(describeAvailability(meta, "vip3", AT_RELEASE)).toBe(
      "Available to you from Sun 25 Oct, 7:00am"
    )
    expect(describeAvailability(meta, "approved", AT_RELEASE)).toBe(
      "Available to you from Sun 25 Oct, 7:00pm"
    )
  })

  it("unknown tiers are treated as public", () => {
    expect(toTier("pending")).toBeNull()
    expect(describeAvailability(meta, toTier("pending"), AT_RELEASE)).toBe(
      "Available to you from Sun 25 Oct, 7:00pm"
    )
  })

  it("ungated products show nothing", () => {
    expect(describeAvailability({}, "approved", AT_RELEASE)).toBeNull()
  })

  it("only nudges tiers that are not already earliest", () => {
    expect(hasEarlierTier("vip5")).toBe(false)
    expect(hasEarlierTier("vip4")).toBe(false)
    expect(hasEarlierTier("vip1")).toBe(true)
    expect(hasEarlierTier(null)).toBe(true)
  })

  it("renders the availability line and VIP nudge", async () => {
    const { html } = await renderEmail(NewDropDigest as any, {
      name: "Sam",
      brewerySection: {
        label: "Fidens",
        products: [
          {
            beerName: "Jasper",
            breweryName: "Fidens",
            image: null,
            handle: "fidens-jasper",
            dispatchId: null,
            availableFrom: "Available to you from Sun 25 Oct, 7:00pm",
          },
        ],
      },
      hopSection: null,
      generalSection: null,
      storeUrl: "https://hopsandglory.au",
      vipNudge: true,
    })
    expect(html).toContain("Available to you from Sun 25 Oct, 7:00pm")
    expect(html).toContain("VIP members get earlier access")
  })
})
