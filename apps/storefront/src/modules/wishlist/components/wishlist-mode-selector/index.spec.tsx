import React from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import WishlistModeSelector from "./index"

const mockToggle = jest.fn()

jest.mock("@modules/wishlist/context", () => ({
  useWishlist: () => ({
    isWishlisted: () => false,
    toggle: (...args: unknown[]) => mockToggle(...args),
    loading: null,
  }),
}))

beforeEach(() => {
  mockToggle.mockReset()
})

describe("WishlistModeSelector — buy-at-price payload contract", () => {
  it("sends the user's typed dollar amount unchanged to toggle() (no x100)", async () => {
    const user = userEvent.setup()
    render(<WishlistModeSelector productId="prod_1" />)

    // Open picker
    await user.click(screen.getByText("Save"))

    // Pick Buy-at-Price
    await user.click(screen.getByText("Buy at Price"))

    // Type 49.99 in the price input
    const input = screen.getByPlaceholderText("0.00") as HTMLInputElement
    await user.clear(input)
    await user.type(input, "49.99")

    // Submit
    const buttons = screen.getAllByText(/Save/i)
    await user.click(buttons[buttons.length - 1])

    // Contract: toggle() is called with dollars (49.99), not cents (4999).
    expect(mockToggle).toHaveBeenCalledTimes(1)
    expect(mockToggle).toHaveBeenCalledWith("prod_1", "buy_at_price", 49.99)
  })

  it("buy_later mode sends undefined for targetPrice", async () => {
    const user = userEvent.setup()
    render(<WishlistModeSelector productId="prod_2" />)

    await user.click(screen.getByText("Save"))
    // Default mode is buy_later; just submit.
    const buttons = screen.getAllByText(/Save/i)
    await user.click(buttons[buttons.length - 1])

    expect(mockToggle).toHaveBeenCalledWith("prod_2", "buy_later", undefined)
  })

  it("placeholder shows current price in dollars (no /100)", async () => {
    const user = userEvent.setup()
    // currentPrice is in dollars per Medusa 2.x convention.
    render(<WishlistModeSelector productId="prod_3" currentPrice={42} />)

    await user.click(screen.getByText("Save"))
    await user.click(screen.getByText("Buy at Price"))

    const input = screen.getByPlaceholderText("42.00") as HTMLInputElement
    expect(input).toBeInTheDocument()
  })
})
