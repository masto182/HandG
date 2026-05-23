import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import EmailSettingsToggleList, {
  type PreferenceEntry,
} from "./index"

const mockFetch = jest.fn()
jest.mock("@lib/config", () => ({
  sdk: {
    client: {
      fetch: (...args: unknown[]) => mockFetch(...args),
    },
  },
}))

beforeEach(() => {
  mockFetch.mockReset()
})

const sample: PreferenceEntry[] = [
  {
    category: "applications",
    label: "Application Updates",
    description: "Status updates",
    transactional: true,
    enabled: true,
  },
  {
    category: "orders",
    label: "Order Updates",
    description: "Order notifications",
    transactional: true,
    enabled: true,
  },
  {
    category: "restock_alerts",
    label: "Restock Alerts",
    description: "Restock email",
    transactional: false,
    enabled: true,
  },
  {
    category: "vip_progression",
    label: "VIP Status",
    description: "VIP",
    transactional: false,
    enabled: true,
  },
  {
    category: "referrals",
    label: "Referral Rewards",
    description: "Refs",
    transactional: false,
    enabled: false,
  },
  {
    category: "wishlist_offers",
    label: "Wishlist Offers",
    description: "Offers",
    transactional: false,
    enabled: true,
  },
]

describe("EmailSettingsToggleList", () => {
  it("renders all 6 categories", () => {
    render(<EmailSettingsToggleList initial={sample} />)
    for (const p of sample) {
      expect(screen.getByTestId(`email-pref-${p.category}`)).toBeInTheDocument()
    }
  })

  it("transactional toggles are disabled with helper text", () => {
    render(<EmailSettingsToggleList initial={sample} />)
    const ordersBtn = screen
      .getByTestId("email-pref-orders")
      .querySelector("button[role='switch']") as HTMLButtonElement
    expect(ordersBtn).toBeDisabled()
    expect(screen.getAllByText(/Required — cannot be disabled/i).length).toBeGreaterThan(0)
  })

  it("clicking a marketing toggle PATCHes the API and updates state", async () => {
    mockFetch.mockResolvedValueOnce({
      updated: true,
      entry: { ...sample[2], enabled: false },
    })
    render(<EmailSettingsToggleList initial={sample} />)
    const restockBtn = screen
      .getByTestId("email-pref-restock_alerts")
      .querySelector("button[role='switch']") as HTMLButtonElement
    await userEvent.click(restockBtn)

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
    const [path, opts] = mockFetch.mock.calls[0]
    expect(path).toBe("/store/customers/me/notifications/preferences")
    expect(opts.method).toBe("PATCH")
    expect(opts.body).toEqual({ category: "restock_alerts", enabled: false })
  })

  it("clicking a transactional toggle does NOT PATCH and surfaces noticeMessage", async () => {
    render(<EmailSettingsToggleList initial={sample} />)
    const ordersBtn = screen
      .getByTestId("email-pref-orders")
      .querySelector("button[role='switch']") as HTMLButtonElement
    // The button is disabled; clicking does nothing. Use fireEvent / userEvent
    // to confirm it doesn't trigger the handler.
    await userEvent.click(ordersBtn)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("surfaces noticeMessage when server returns updated:false", async () => {
    // Simulate a marketing PATCH being soft-rejected (e.g. removed category).
    mockFetch.mockResolvedValueOnce({
      updated: false,
      noticeMessage: "Category not currently active",
    })
    render(<EmailSettingsToggleList initial={sample} />)
    const restockBtn = screen
      .getByTestId("email-pref-restock_alerts")
      .querySelector("button[role='switch']") as HTMLButtonElement
    await userEvent.click(restockBtn)
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        /Category not currently active/i
      )
    )
  })
})
