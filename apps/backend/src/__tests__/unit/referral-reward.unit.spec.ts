import { config } from "../../subscribers/email-referral-reward"

describe("email-referral-reward subscriber (H3)", () => {
  it("fires on order.payment_captured, not order.placed", () => {
    // H3: rewarding on order.placed would pay out before a PayID order is
    // actually paid (and could be cancelled later).
    expect(config.event).toBe("order.payment_captured")
  })
})
