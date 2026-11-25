"use client"

import CartTotals from "@modules/common/components/cart-totals"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Icon from "@modules/common/components/icon"
import { deleteLineItem } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { useRouter } from "next/navigation"
import { useState } from "react"
import type { VariantAvailabilityMap } from "@lib/util/stock"
import { getUnavailableLineIds } from "@lib/util/stock"

type SummaryProps = {
  cart: HttpTypes.StoreCart
  availability?: VariantAvailabilityMap | null
}

function getCheckoutStep(cart: HttpTypes.StoreCart) {
  return "fulfilment"
}

const Summary = ({ cart, availability = null }: SummaryProps) => {
  const step = getCheckoutStep(cart)
  const router = useRouter()
  const [promoOpen, setPromoOpen] = useState(false)
  const [removing, setRemoving] = useState(false)

  const unavailableIds = availability
    ? getUnavailableLineIds(cart.items ?? [], availability)
    : []
  const blocked = availability === null || unavailableIds.length > 0

  const removeUnavailable = async () => {
    setRemoving(true)
    for (const id of unavailableIds) {
      await deleteLineItem(id).catch(() => undefined)
    }
    setRemoving(false)
    router.refresh()
  }

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
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Enter code"
            className="flex-1 min-w-[140px] px-3 py-2 text-sm bg-surface-container-low border border-outline-variant rounded-lg text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <button className="px-4 py-2 text-sm font-bold bg-surface-container border border-outline-variant rounded-lg text-on-surface hover:border-outline transition-colors whitespace-nowrap">
            Apply
          </button>
        </div>
      )}
      {blocked && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-xl border border-hl-error p-4"
        >
          <p className="font-semibold text-hl-error">
            {availability === null
              ? "We could not check stock right now"
              : "Some items are sold out"}
          </p>
          <p className="text-sm text-on-surface-variant">
            {availability === null
              ? "Please refresh the page and try again."
              : "Remove them to continue to checkout."}
          </p>
          {unavailableIds.length > 0 && (
            <button
              type="button"
              onClick={removeUnavailable}
              disabled={removing}
              data-testid="remove-unavailable-items"
              className="mt-2 min-h-[44px] rounded-lg bg-hg-gold text-hg-bg font-bold text-sm hover:brightness-110 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hg-gold disabled:opacity-50"
            >
              {removing ? "Removing..." : "Remove sold-out items"}
            </button>
          )}
        </div>
      )}
      <div className="space-y-3">
        {!blocked ? (
          <LocalizedClientLink
            href={"/checkout?step=" + step}
            data-testid="checkout-button"
            className="w-full bg-primary text-on-primary font-bold py-3.5 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            Proceed to Checkout
            <Icon name="payments" size={18} />
          </LocalizedClientLink>
        ) : (
          <button
            type="button"
            disabled
            data-testid="checkout-button-disabled"
            className="w-full bg-surface-container-high text-on-surface-variant font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 opacity-60 cursor-not-allowed"
          >
            Proceed to Checkout
          </button>
        )}
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
