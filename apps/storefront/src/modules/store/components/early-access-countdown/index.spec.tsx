import { act, render, screen } from "@testing-library/react"
import EarlyAccessCountdown, { formatCountdown } from "./index"

const refresh = jest.fn()
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }))

const HOUR = 3600 * 1000
const NOW = new Date("2026-06-10T08:00:00.000Z")
const at = (hours: number) => new Date(NOW.getTime() + hours * HOUR)

describe("formatCountdown", () => {
  it("formats each magnitude", () => {
    expect(formatCountdown(0)).toBe("now")
    expect(formatCountdown(45_000)).toBe("45s")
    expect(formatCountdown(125_000)).toBe("2m 5s")
    expect(formatCountdown(3 * HOUR + 60_000)).toBe("3h 1m")
    expect(formatCountdown(26 * HOUR)).toBe("1d 2h 0m")
  })
})

describe("EarlyAccessCountdown", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(NOW)
    refresh.mockClear()
  })
  afterEach(() => jest.useRealTimers())

  it("renders nothing when there is no release", () => {
    const { container } = render(<EarlyAccessCountdown viewerTier="vip3" />)
    expect(container).toBeEmptyDOMElement()
  })

  it("renders nothing once the viewer's tier is unlocked", () => {
    const { container } = render(
      <EarlyAccessCountdown releaseAt={at(-1)} viewerTier="vip5" />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("shows who has access now and the viewer's countdown", () => {
    // Released 1h ago: VIP4/5 in, VIP3 waits until +12h.
    render(<EarlyAccessCountdown releaseAt={at(-1)} viewerTier="vip3" />)
    expect(screen.getByText("VIP4")).toBeInTheDocument()
    expect(screen.getByText("11h 0m")).toBeInTheDocument()
  })

  it("makes anonymous viewers wait for the public release", () => {
    render(
      <EarlyAccessCountdown
        releaseAt={at(-1).toISOString()}
        viewerTier={null}
      />,
    )
    expect(screen.getByText("23h 0m")).toBeInTheDocument()
  })

  it("falls back to the legacy public-release key", () => {
    // Public in 2h => release was 22h ago => VIP1 (21h) and above have access.
    render(
      <EarlyAccessCountdown earlyAccessUntil={at(2)} viewerTier="approved" />,
    )
    expect(screen.getByText("VIP1")).toBeInTheDocument()
    expect(screen.getByText("2h 0m")).toBeInTheDocument()
  })

  it("locks with no countdown when the release date is invalid", () => {
    render(
      <EarlyAccessCountdown releaseAt={new Date("nope")} viewerTier="vip5" />,
    )
    expect(
      screen.getByText("This release isn't available yet."),
    ).toBeInTheDocument()
  })

  it("ticks down and refreshes the page at unlock", () => {
    render(
      <EarlyAccessCountdown
        releaseAt={new Date(NOW.getTime() + 30_000)}
        viewerTier="vip5"
      />,
    )
    expect(screen.getByText("30s")).toBeInTheDocument()
    act(() => {
      jest.advanceTimersByTime(10_000)
    })
    expect(screen.getByText("20s")).toBeInTheDocument()
    act(() => {
      jest.advanceTimersByTime(21_000)
    })
    expect(refresh).toHaveBeenCalled()
  })
})
