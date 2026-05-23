import React from "react"
import { render, screen } from "@testing-library/react"
import BuyAtPriceBanner from "./index"

describe("BuyAtPriceBanner", () => {
  it("renders offer price formatted correctly", () => {
    render(
      <BuyAtPriceBanner
        offerPrice={75}
        currencyCode="AUD"
        expiresAt={null}
      />
    )
    expect(screen.getByTestId("buy-at-price-banner")).toBeInTheDocument()
    expect(screen.getByText("$75.00")).toBeInTheDocument()
    expect(screen.getByText("Your accepted offer")).toBeInTheDocument()
  })

  it("shows expiry text when expiresAt is set", () => {
    const threeDaysFromNow = new Date(
      Date.now() + 3 * 24 * 60 * 60 * 1000
    ).toISOString()
    render(
      <BuyAtPriceBanner
        offerPrice={50}
        currencyCode="AUD"
        expiresAt={threeDaysFromNow}
      />
    )
    expect(screen.getByText("Expires in 3d")).toBeInTheDocument()
  })

  it("shows 'Expires today' when less than 1 day remains", () => {
    const halfDayFromNow = new Date(
      Date.now() + 6 * 60 * 60 * 1000
    ).toISOString()
    render(
      <BuyAtPriceBanner
        offerPrice={50}
        currencyCode="AUD"
        expiresAt={halfDayFromNow}
      />
    )
    expect(screen.getByText(/expires/i)).toBeInTheDocument()
  })

  it("does not show expiry when expiresAt is null", () => {
    render(
      <BuyAtPriceBanner
        offerPrice={50}
        currencyCode="AUD"
        expiresAt={null}
      />
    )
    expect(screen.queryByText(/expires/i)).not.toBeInTheDocument()
  })
})
