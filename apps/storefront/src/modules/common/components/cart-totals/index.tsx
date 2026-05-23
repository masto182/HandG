import { convertToLocale } from "@lib/util/money"
import Divider from "@modules/common/components/divider"
import { HttpTypes } from "@medusajs/types"

type CartTotalsProps = {
  totals: {
    total?: number | null
    subtotal?: number | null
    item_subtotal?: number | null
    tax_total?: number | null
    shipping_total?: number | null
    discount_total?: number | null
    currency_code?: string
  }
}

export default function CartTotals({ totals }: CartTotalsProps) {
  const { currency_code = "aud", total, subtotal, item_subtotal, shipping_total, discount_total } =
    totals

  const productSubtotal = item_subtotal ?? subtotal

  const fmt = (amount: number | null | undefined) =>
    convertToLocale({ amount: amount ?? 0, currency_code })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between text-body-md text-on-surface">
        <span className="text-on-surface-variant">Subtotal</span>
        <span>{fmt(productSubtotal)}</span>
      </div>

      {discount_total ? (
        <div className="flex justify-between text-body-md text-primary">
          <span>Discount</span>
          <span>-{fmt(discount_total)}</span>
        </div>
      ) : null}

      <div className="flex justify-between text-body-md text-on-surface">
        <span className="text-on-surface-variant">Shipping</span>
        <span>{shipping_total ? fmt(shipping_total) : "Calculated next step"}</span>
      </div>

      <Divider />

      <div className="flex justify-between text-h3 text-on-surface pt-1">
        <span>Total</span>
        <span>{fmt(total)}</span>
      </div>
    </div>
  )
}
