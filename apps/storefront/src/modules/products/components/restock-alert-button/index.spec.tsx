import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import RestockAlertButton from "./index"

// Mock the Medusa SDK client used by the component.
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

const baseProps = {
  productId: "prod_1",
  beerName: "Hazy IPA",
  breweryName: "Test Brewery",
}

describe("RestockAlertButton", () => {
  it("renders idle state with subscribe CTA", () => {
    render(<RestockAlertButton {...baseProps} />)
    expect(screen.getByTestId("restock-alert-idle")).toHaveTextContent(/Notify me when available/i)
  })

  it("renders subscribed state when initialAlertId is provided", () => {
    render(<RestockAlertButton {...baseProps} initialAlertId="ra_1" />)
    expect(screen.getByTestId("restock-alert-subscribed")).toHaveTextContent(/Subscribed/i)
    expect(screen.getByText(/Unsubscribe/i)).toBeInTheDocument()
  })

  it("transitions idle -> subscribed on successful POST", async () => {
    mockFetch.mockResolvedValueOnce({ restock_alert: { id: "ra_new" } })
    const user = userEvent.setup()
    render(<RestockAlertButton {...baseProps} />)
    await user.click(screen.getByTestId("restock-alert-idle"))
    await waitFor(() => expect(screen.getByTestId("restock-alert-subscribed")).toBeInTheDocument())
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch.mock.calls[0][0]).toBe("/store/customers/me/restock-alerts")
    expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: "POST" })
  })

  it("transitions subscribed -> idle on successful DELETE", async () => {
    mockFetch.mockResolvedValueOnce({})
    const user = userEvent.setup()
    render(<RestockAlertButton {...baseProps} initialAlertId="ra_existing" />)
    await user.click(screen.getByText(/Unsubscribe/i))
    await waitFor(() => expect(screen.getByTestId("restock-alert-idle")).toBeInTheDocument())
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch.mock.calls[0][0]).toBe("/store/customers/me/restock-alerts/ra_existing")
    expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: "DELETE" })
  })

  it("shows error state and 'Try again' when subscribe fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network down"))
    const user = userEvent.setup()
    render(<RestockAlertButton {...baseProps} />)
    await user.click(screen.getByTestId("restock-alert-idle"))
    await waitFor(() => expect(screen.getByTestId("restock-alert-error")).toBeInTheDocument())
    expect(screen.getByText(/Network down/i)).toBeInTheDocument()
    expect(screen.getByText(/Try again/i)).toBeInTheDocument()
  })

  it("recovers from error state on successful retry", async () => {
    mockFetch
      .mockRejectedValueOnce(new Error("Boom"))
      .mockResolvedValueOnce({ restock_alert: { id: "ra_retry" } })
    const user = userEvent.setup()
    render(<RestockAlertButton {...baseProps} />)
    await user.click(screen.getByTestId("restock-alert-idle"))
    await waitFor(() => expect(screen.getByTestId("restock-alert-error")).toBeInTheDocument())
    await user.click(screen.getByText(/Try again/i))
    await waitFor(() => expect(screen.getByTestId("restock-alert-subscribed")).toBeInTheDocument())
  })
})
