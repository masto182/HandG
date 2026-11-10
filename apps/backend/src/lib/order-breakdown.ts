export type OrderBreakdown = {
  subtotal: number
  shippingTotal: number
  discountTotal: number
  shippingMethodName?: string
  promotionCodes: string[]
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function computeOrderBreakdown(input: {
  items: { quantity: number; unit_price: number }[]
  shippingMethods?: { name?: string | null; amount?: number | string | null }[]
  promotions?: { code?: string | null }[]
  total: number
}): OrderBreakdown {
  const subtotal = round2(
    input.items.reduce((sum, it) => sum + Number(it.unit_price || 0) * Number(it.quantity || 0), 0)
  )
  const methods = input.shippingMethods || []
  const shippingTotal = round2(methods.reduce((sum, sm) => sum + (Number(sm.amount) || 0), 0))
  const discountTotal = Math.max(0, round2(subtotal + shippingTotal - Number(input.total || 0)))
  const shippingMethodName = methods.map((sm) => sm.name).find((n): n is string => !!n)
  const promotionCodes = [
    ...new Set((input.promotions || []).map((p) => p.code).filter((c): c is string => !!c)),
  ]
  return { subtotal, shippingTotal, discountTotal, shippingMethodName, promotionCodes }
}
