"use client"
import { placeOrder } from "@lib/data/cart"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import HeatHoldBanner from "@modules/checkout/components/heat-hold-banner"
import Thumbnail from "@modules/products/components/thumbnail"
import { useState } from "react"

type Props = {
  cart: HttpTypes.StoreCart
  isPickup: boolean
  heatHold?: { enabled: boolean; message: string }
}

function getBrewery(item: any): string | undefined {
  const meta = item?.product?.metadata || item?.variant?.product?.metadata
  return meta?.brewery_name || meta?.brewery || item?.product_collection || undefined
}

function getFormat(item: any): string {
  const opts: Array<{ value?: string; option?: { title?: string } }> =
    item?.variant?.options ?? []
  const fmt = opts.find(
    (o) => (o.option?.title ?? "").toLowerCase() === "format",
  )?.value
  if (fmt) return fmt
  const vt = (item?.variant_title ?? "") as string
  const m = vt.match(/(?:\u2014|-)\s*(can|crowler|bottle)s?\b/i)
  if (m?.[1]) {
    return m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase()
  }
  return "Can"
}

// Hide the carrier caption when the service name already starts with the carrier
// (or a known abbreviation) so we don't render "AusPost Parcel Post" / "AUSTRALIA POST".
const CARRIER_ABBREVS: Record<string, string[]> = {
  "australia post": ["auspost"],
  "couriers please": ["cp"],
}
function shouldShowCarrierCaption(displayName: string, carrierLabel?: string): boolean {
  if (!carrierLabel) return false
  const dn = displayName.toLowerCase()
  const cl = carrierLabel.toLowerCase()
  if (dn.startsWith(cl)) return false
  for (const abbr of CARRIER_ABBREVS[cl] ?? []) {
    if (dn.startsWith(abbr)) return false
  }
  return true
}

const StepReview: React.FC<Props> = ({ cart, isPickup, heatHold }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const shippingMethod = cart.shipping_methods?.at(-1)
  const shippingData = (shippingMethod?.data ?? {}) as Record<string, unknown>
  const shippingDisplayName =
    (shippingData.service_display_name as string | undefined) ??
    shippingMethod?.name ??
    (isPickup ? "In-Store Pickup" : "Delivery")
  const shippingCarrierLabel = shippingData.carrier_display_name as string | undefined
  const showShippingCarrierCaption = shouldShowCarrierCaption(
    shippingDisplayName,
    shippingCarrierLabel,
  )
  const paymentSession = cart.payment_collection?.payment_sessions?.find(
    (s) => s.status === "pending"
  )

  const handlePlaceOrder = async () => {
    if (isLoading) return
    setIsLoading(true)
    setError(null)
    try {
      await placeOrder(cart.id)
    } catch (e: any) {
      setError(e.message || "Failed to place order")
    } finally {
      setIsLoading(false)
    }
  }

  const addr = cart.shipping_address

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-h1 text-hg-text mb-4">
          Review Your Order
        </h1>
        <p className="text-lg leading-relaxed text-hg-text-secondary">
          Please verify your details before finalising your craft selection.
        </p>
      </div>

      {error && <p className="text-sm text-hl-error mb-4">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {!isPickup && addr && (
          <div className="p-6 bg-hg-surface border border-hg-border rounded-xl">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-hg-gold"><rect x="1" y="3" width="15" height="13" rx="2" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
                <h3 className="text-lg font-semibold text-hg-text">Shipping To</h3>
              </div>
              <a href="/checkout?step=address" className="text-hg-gold font-semibold text-[11px] hover:underline uppercase tracking-widest">Edit</a>
            </div>
            <div className="space-y-1 text-sm text-hg-text-secondary">
              <p className="font-bold text-hg-text">{addr.first_name} {addr.last_name}</p>
              <p>{addr.address_1}</p>
              {addr.company && <p>{addr.company}</p>}
              <p>{addr.city}, {addr.province} {addr.postal_code}</p>
              {addr.phone && <p className="mt-2">{addr.phone}</p>}
            </div>
          </div>
        )}

        <div className="p-6 bg-hg-surface border border-hg-border rounded-xl">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-hg-gold"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
              <h3 className="text-lg font-semibold text-hg-text">Method</h3>
            </div>
            <a href={isPickup ? "/checkout?step=fulfilment" : "/checkout?step=shipping"} className="text-hg-gold font-semibold text-[11px] hover:underline uppercase tracking-widest">Edit</a>
          </div>
          <div className="space-y-1 text-sm text-hg-text-secondary">
            <p className="font-bold text-hg-text">{shippingDisplayName}</p>
            {showShippingCarrierCaption && shippingCarrierLabel && (
              <p className="text-[10px] uppercase tracking-widest text-hg-text-secondary mt-0.5">
                {shippingCarrierLabel}
              </p>
            )}
            {shippingMethod?.amount != null && (
              <p>{convertToLocale({ amount: shippingMethod.amount, currency_code: cart.currency_code })}</p>
            )}
          </div>
        </div>

        <div className="p-6 bg-hg-surface border border-hg-border rounded-xl md:col-span-2">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-hg-gold"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
              <h3 className="text-lg font-semibold text-hg-text">Payment Method</h3>
            </div>
            <a href="/checkout?step=payment" className="text-hg-gold font-semibold text-[11px] hover:underline uppercase tracking-widest">Edit</a>
          </div>
          <div className="flex items-center gap-4 text-sm text-hg-text-secondary">
            <div className="h-10 w-16 bg-hl-surface3 rounded flex items-center justify-center border border-hg-border">
              <span className="font-bold text-xs text-hg-text-secondary uppercase">PayID</span>
            </div>
            <p className="text-hg-text">
              {paymentSession?.provider_id?.includes("payid") ? "PayID Transfer" : "Cash on Pickup"}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-semibold text-hg-text mb-4 flex items-center gap-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-hg-gold"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>
          Your Selection
        </h3>
        <div className="space-y-3">
          {cart.items?.map((item) => {
            const brewery = getBrewery(item)
            const format = getFormat(item)
            return (
            <div key={item.id} className="flex gap-4 p-4 bg-hg-surface border border-hg-border rounded-xl hover:bg-hl-surface2 transition-colors">
              <div className="h-20 w-20 bg-hl-surface3 rounded-lg overflow-hidden flex-shrink-0 border border-hg-border">
                <Thumbnail thumbnail={item.thumbnail} size="square" className="w-full h-full object-cover" />
              </div>
              <div className="flex-grow">
                <div className="flex justify-between items-start">
                  <div>
                    {brewery && (
                      <p className="text-[10px] text-hg-gold font-semibold uppercase tracking-widest">{brewery}</p>
                    )}
                    <h4 className="text-base font-semibold text-hg-text mt-0.5">{item.product_title}</h4>
                  </div>
                  <span className="font-bold text-base text-hl-price">
                    {convertToLocale({ amount: item.subtotal ?? 0, currency_code: cart.currency_code })}
                  </span>
                </div>
                <div className="mt-3 flex gap-6 text-xs font-semibold text-hg-text-secondary uppercase tracking-wider">
                  <span>{format}</span>
                  <span>Qty: {item.quantity}</span>
                </div>
              </div>
            </div>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-hg-border">
        <a href="/checkout?step=payment" className="flex items-center gap-2 text-sm text-hg-text-secondary hover:text-hg-text transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          Back to Payment
        </a>
        <button
          onClick={handlePlaceOrder}
          disabled={isLoading}
          className="px-10 py-4 bg-hg-gold text-hg-on-primary font-semibold text-[12px] uppercase tracking-[0.1em] rounded-lg transition-transform hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50"
        >
          {isLoading ? "Placing Order..." : "Place Order"}
        </button>
      </div>
      {heatHold && !isPickup ? (
        <div className="mt-6">
          <HeatHoldBanner enabled={heatHold.enabled} message={heatHold.message} />
        </div>
      ) : null}
    </div>
  )
}

export default StepReview
