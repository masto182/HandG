import { act, fireEvent, render, screen } from "@testing-library/react"
import EarlyAccessCartGate from "./index"

const refresh = jest.fn()
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }))
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => <a href={href}>{children}</a>,
}))
const deleteLineItem = jest.fn().mockResolvedValue(undefined)
jest.mock("@lib/data/cart", () => ({
  deleteLineItem: (id: string) => deleteLineItem(id),
}))

const HOUR = 3600 * 1000
const NOW = new Date("2026-06-10T08:00:00.000Z")

function item(lineId: string, title: string, releaseOffsetHours: number) {
  return {
    lineId,
    title,
    metadata: {
      release_at: new Date(
        NOW.getTime() + releaseOffsetHours * HOUR,
      ).toISOString(),
    },
  }
}

describe("EarlyAccessCartGate", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(NOW)
  })
  afterEach(() => jest.useRealTimers())

  it("renders nothing when every item is unlocked for the viewer", () => {
    render(
      <EarlyAccessCartGate
        items={[item("l1", "Open Beer", -1)]}
        viewerTier="vip5"
      />,
    )
    expect(screen.queryByTestId("early-access-cart-gate")).toBeNull()
  })

  it("blocks with a countdown for an item the tier can't buy yet", () => {
    // Released 1h ago: VIP5 open, approved opens in 23h.
    render(
      <EarlyAccessCartGate
        items={[item("l1", "Hazy One", -1)]}
        viewerTier="approved"
      />,
    )
    expect(screen.getByTestId("early-access-cart-gate")).toBeInTheDocument()
    expect(screen.getByText("Hazy One")).toBeInTheDocument()
    expect(screen.getByText("23h 0m")).toBeInTheDocument()
  })

  it("refreshes the page when the item unlocks", () => {
    render(
      <EarlyAccessCartGate
        items={[item("l1", "Hazy One", -11.999)]}
        viewerTier="vip3"
      />,
    )
    expect(screen.getByTestId("early-access-cart-gate")).toBeInTheDocument()
    act(() => {
      jest.advanceTimersByTime(10_000)
    })
    expect(refresh).toHaveBeenCalled()
    expect(screen.queryByTestId("early-access-cart-gate")).toBeNull()
  })

  it("lets the shopper remove the locked item", async () => {
    render(
      <EarlyAccessCartGate
        items={[item("l9", "Hazy One", 1)]}
        viewerTier="vip5"
      />,
    )
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Remove" }))
    })
    expect(deleteLineItem).toHaveBeenCalledWith("l9")
  })
})
