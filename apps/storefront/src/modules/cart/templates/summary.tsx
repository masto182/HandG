"use client"

import CartTotals from "@modules/common/components/cart-totals"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Icon from "@modules/common/components/icon"
import { HttpTypes } from "@medusajs/types"
import { useState } from "react"

type SummaryProps = {
  cart: HttpTypes.StoreCart
}

function getCheckoutStep(cart: HttpTypes.StoreCart) {
  return "fulfilment"
}

const Summary = ({ cart }: SummaryProps) => {
  const step = getCheckoutStep(cart)
  const [promoOpen, setPromoOpen] = useState(false)

  return (
    <div className="flex flex-col gap-y-6">
      <h2 className="text-h3 text-on-surface">Order Summary</h2>
      <CartTotals totals={cart} />
      {!promoOpen ? (
        <button
          onClick={() => setPromoOpen(true)}
          className="text-body-sm text-on-surface-variant hover:text-primary transition-colors text-left"
        >
          Have a promo code?
        </button>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter code"
            className="flex-1 px-3 py-2 text-sm bg-surface-container-low border border-outline-variant rounded-lg text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <button className="px-4 py-2 text-sm font-bold bg-surface-container border border-outline-variant rounded-lg text-on-surface hover:border-outline transition-colors">
            Apply
          </button>
        </div>
      )}
      <div className="space-y-3">
        <LocalizedClientLink
          href={"/checkout?step=" + step}
          data-testid="checkout-button"
          className="w-full bg-primary text-on-primary font-bold py-3.5 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          Proceed to Checkout
          <Icon name="payments" size={18} />
        </LocalizedClientLink>
        <LocalizedClientLink
          href="/store"
          className="w-full inline-flex justify-center items-center py-3.5 text-on-surface-variant font-medium border border-outline-variant rounded-xl hover:bg-surface-container-high transition-all"
        >
          Keep shopping
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default Summary
