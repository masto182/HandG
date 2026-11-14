const sendEmail = jest.fn()
jest.mock("../../lib/email", () => ({ sendEmail: (...args: unknown[]) => sendEmail(...args) }))

import { buildOwnerOrderAlert, notifyOwnerOfOrder, paymentLabel } from "../../lib/owner-alerts"

const alert = {
  orderId: "order_01",
  orderDisplayId: "1042",
  customerEmail: "buyer@test.dev",
  customerName: "Sam <b>",
  items: [{ title: "Fidens Jasper", quantity: 2, unit_price: 18 }],
  total: 36,
  currencyCode: "aud",
  isPickup: false,
  isCash: false,
  isPayId: true,
}

function containerWith(alertsTo: string | undefined) {
  return { resolve: () => ({ get: async () => alertsTo }) }
}

describe("owner order alert", () => {
  beforeEach(() => sendEmail.mockReset())

  it("labels PayID orders as awaiting transfer", () => {
    expect(paymentLabel({ isPayId: true, isCash: false })).toBe("PayID — awaiting transfer")
    expect(paymentLabel({ isPayId: false, isCash: true })).toBe("Cash on pickup")
  })

  it("builds subject, admin link and escapes customer input", () => {
    const out = buildOwnerOrderAlert(alert, "https://hopsandglory.au/troon/admin/")
    expect(out.subject).toBe("New order #1042 — $36.00 — PayID — awaiting transfer")
    expect(out.text).toContain("https://hopsandglory.au/troon/admin/orders/order_01")
    expect(out.text).toContain("2 × Fidens Jasper ($18.00)")
    expect(out.html).toContain("Sam &lt;b&gt;")
    expect(out.html).not.toContain("<b>")
  })

  it("sends to email_alerts_to", async () => {
    const sent = await notifyOwnerOfOrder(containerWith("alerts@hopsandglory.au"), alert)
    expect(sent).toBe(true)
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "alerts@hopsandglory.au", category: "owner_alerts" })
    )
  })

  it("skips when the alerts inbox is unset or still the placeholder", async () => {
    expect(await notifyOwnerOfOrder(containerWith(undefined), alert)).toBe(false)
    expect(await notifyOwnerOfOrder(containerWith("alerts@example.com"), alert)).toBe(false)
    expect(sendEmail).not.toHaveBeenCalled()
  })
})
