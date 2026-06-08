import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import AlertHopButton from "./index"

jest.mock("@lib/data/hop-alerts", () => ({
  subscribeHopAlert: jest.fn(),
  unsubscribeHopAlert: jest.fn(),
}))

import { subscribeHopAlert, unsubscribeHopAlert } from "@lib/data/hop-alerts"

const mockSubscribe = subscribeHopAlert as jest.MockedFunction<
  typeof subscribeHopAlert
>
const mockUnsubscribe = unsubscribeHopAlert as jest.MockedFunction<
  typeof unsubscribeHopAlert
>

describe("AlertHopButton (pill variant)", () => {
  beforeEach(() => {
    mockSubscribe.mockReset()
    mockUnsubscribe.mockReset()
  })

  it("shows 'Alert me' when not alerted", () => {
    render(<AlertHopButton hopId="h1" initialAlerted={false} />)
    expect(screen.getByText(/alert me/i)).toBeInTheDocument()
  })

  it("shows 'Alerts on' when already alerted", () => {
    render(<AlertHopButton hopId="h1" initialAlerted={true} />)
    expect(screen.getByText(/alerts on/i)).toBeInTheDocument()
  })

  it("calls subscribeHopAlert when clicking from unalerted state", async () => {
    mockSubscribe.mockResolvedValue(true)
    render(<AlertHopButton hopId="h1" initialAlerted={false} />)
    fireEvent.click(screen.getByRole("button"))
    await waitFor(() => expect(mockSubscribe).toHaveBeenCalledWith("h1"))
    expect(screen.getByText(/alerts on/i)).toBeInTheDocument()
  })

  it("calls unsubscribeHopAlert when clicking from alerted state", async () => {
    mockUnsubscribe.mockResolvedValue(true)
    render(<AlertHopButton hopId="h1" initialAlerted={true} />)
    fireEvent.click(screen.getByRole("button"))
    await waitFor(() => expect(mockUnsubscribe).toHaveBeenCalledWith("h1"))
    expect(screen.getByText(/alert me/i)).toBeInTheDocument()
  })

  it("reverts optimistic update when API fails", async () => {
    mockSubscribe.mockResolvedValue(false)
    render(<AlertHopButton hopId="h1" initialAlerted={false} />)
    fireEvent.click(screen.getByRole("button"))
    await waitFor(() =>
      expect(screen.getByText(/alert me/i)).toBeInTheDocument(),
    )
  })
})
