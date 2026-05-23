import { render, screen } from "@testing-library/react"
import HeatHoldBanner from "@modules/checkout/components/heat-hold-banner"

describe("HeatHoldBanner", () => {
  it("renders default content when enabled", () => {
    render(<HeatHoldBanner enabled />)
    expect(screen.getByTestId("heat-hold-banner")).toBeInTheDocument()
    expect(screen.getByText(/Heat hold is active/i)).toBeInTheDocument()
    expect(screen.getByText(/queued and will dispatch/i)).toBeInTheDocument()
  })

  it("renders the provided custom message", () => {
    render(<HeatHoldBanner enabled message="Custom heat copy for testing" />)
    expect(screen.getByText(/Custom heat copy for testing/)).toBeInTheDocument()
  })

  it("renders nothing when disabled", () => {
    const { container } = render(<HeatHoldBanner enabled={false} />)
    expect(container.firstChild).toBeNull()
  })
})
