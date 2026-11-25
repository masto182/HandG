import { render, screen } from "@testing-library/react"
import UnavailableItemsAlert from "@modules/checkout/components/unavailable-items-alert"

describe("UnavailableItemsAlert", () => {
  it("renders nothing when every item is available", () => {
    const { container } = render(<UnavailableItemsAlert titles={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it("names a single sold-out item and links back to the cart", () => {
    render(<UnavailableItemsAlert titles={["Dankest Days"]} />)
    expect(screen.getByRole("alert")).toBeInTheDocument()
    expect(
      screen.getByText(/Dankest Days is no longer available/i),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /back to cart/i })).toHaveAttribute(
      "href",
      "/cart",
    )
  })

  it("names several items with plural copy", () => {
    render(<UnavailableItemsAlert titles={["Dankest Days", "Raw Concrete"]} />)
    expect(
      screen.getByText(
        /Dankest Days and Raw Concrete are no longer available/i,
      ),
    ).toBeInTheDocument()
    expect(screen.getByText(/Remove them from your cart/i)).toBeInTheDocument()
  })

  it("renders an extra action next to Back to cart and softens the copy", () => {
    render(
      <UnavailableItemsAlert titles={["Dankest Days"]}>
        <button type="button">Remove sold-out item and continue</button>
      </UnavailableItemsAlert>,
    )
    expect(
      screen.getByRole("button", {
        name: /remove sold-out item and continue/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: /back to cart/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Update your cart to continue/i),
    ).toBeInTheDocument()
  })
})
