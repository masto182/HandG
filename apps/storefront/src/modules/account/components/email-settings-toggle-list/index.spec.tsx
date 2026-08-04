import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import EmailSettingsToggleList, { type PreferenceEntry } from "./index"

const mockUpdatePref = jest.fn()
jest.mock("@lib/data/notification-prefs", () => ({
  updateNotificationPreference: (...args: unknown[]) => mockUpdatePref(...args),
}))

beforeEach(() => {
  mockUpdatePref.mockReset()
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
    expect(
      screen.getAllByText(/Required — cannot be disabled/i).length,
    ).toBeGreaterThan(0)
  })

  it("clicking a marketing toggle calls updateNotificationPreference and updates state", async () => {
    mockUpdatePref.mockResolvedValueOnce({
      updated: true,
      entry: { ...sample[2], enabled: false },
    })
    render(<EmailSettingsToggleList initial={sample} />)
    const restockBtn = screen
      .getByTestId("email-pref-restock_alerts")
      .querySelector("button[role='switch']") as HTMLButtonElement
    await userEvent.click(restockBtn)

    await waitFor(() => expect(mockUpdatePref).toHaveBeenCalledTimes(1))
    expect(mockUpdatePref).toHaveBeenCalledWith("restock_alerts", false)
  })

  it("clicking a transactional toggle does NOT call updateNotificationPreference and surfaces noticeMessage", async () => {
    render(<EmailSettingsToggleList initial={sample} />)
    const ordersBtn = screen
      .getByTestId("email-pref-orders")
      .querySelector("button[role='switch']") as HTMLButtonElement
    await userEvent.click(ordersBtn)
    expect(mockUpdatePref).not.toHaveBeenCalled()
  })

  it("surfaces noticeMessage when server returns updated:false", async () => {
    mockUpdatePref.mockResolvedValueOnce({
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
        /Category not currently active/i,
      ),
    )
  })
})
