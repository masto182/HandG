import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import FixUnavailableButton from "@modules/checkout/components/fix-unavailable-button"

const deleteLineItem = jest.fn()
const updateLineItem = jest.fn()
const refresh = jest.fn()

jest.mock("@lib/data/cart", () => ({
  deleteLineItem: (...a: unknown[]) => deleteLineItem(...a),
  updateLineItem: (...a: unknown[]) => updateLineItem(...a),
}))
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}))

describe("FixUnavailableButton", () => {
  it("renders nothing when there is nothing to fix", () => {
    const { container } = render(<FixUnavailableButton actions={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it("removes sold-out lines, then refreshes the page", async () => {
    deleteLineItem.mockResolvedValue(undefined)
    render(<FixUnavailableButton actions={[{ id: "l1", kind: "remove" }]} />)
    fireEvent.click(
      screen.getByRole("button", {
        name: /remove sold-out item and continue/i,
      }),
    )
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(deleteLineItem).toHaveBeenCalledWith("l1")
    expect(updateLineItem).not.toHaveBeenCalled()
  })

  it("reduces short-stock lines to the available quantity", async () => {
    deleteLineItem.mockResolvedValue(undefined)
    updateLineItem.mockResolvedValue(undefined)
    render(
      <FixUnavailableButton
        actions={[
          { id: "l1", kind: "remove" },
          { id: "l2", kind: "reduce", quantity: 2 },
        ]}
      />,
    )
    fireEvent.click(
      screen.getByRole("button", { name: /update cart and continue/i }),
    )
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(deleteLineItem).toHaveBeenCalledWith("l1")
    expect(updateLineItem).toHaveBeenCalledWith({ lineId: "l2", quantity: 2 })
  })

  it("shows a recoverable message and does not refresh when an update fails", async () => {
    deleteLineItem.mockRejectedValue(new Error("boom"))
    render(<FixUnavailableButton actions={[{ id: "l1", kind: "remove" }]} />)
    fireEvent.click(screen.getByRole("button"))
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        /could not update your cart/i,
      ),
    )
    expect(refresh).not.toHaveBeenCalled()
  })
})
