export type CompleteFailure = {
  code: "OUT_OF_STOCK" | "UNKNOWN"
  message: string
}

const OUT_OF_STOCK_PATTERN = /not enough stock|out of stock|insufficient stock/i

export function classifyCompleteFailure(rawMessage: unknown): CompleteFailure {
  const text = String(rawMessage ?? "")
  if (OUT_OF_STOCK_PATTERN.test(text)) {
    return {
      code: "OUT_OF_STOCK",
      message:
        "One or more items in your cart is no longer available. Return to your cart to update it.",
    }
  }
  return {
    code: "UNKNOWN",
    message:
      "We could not place your order. Please return to your cart and try again.",
  }
}
