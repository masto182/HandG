"use client"
import { setShippingMethod, updateCart } from "@lib/data/cart"
import { getPickupOptions, getDeliveryOptions } from "@lib/util/shipping"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { useRouter } from "next/navigation"
import { useState } from "react"

type Props = {
  cart: HttpTypes.StoreCart
  shippingOptions: HttpTypes.StoreCartShippingOption[] | null
}

function formatLocationAddress(option: any): string {
  const addr = option.service_zone?.fulfillment_set?.location?.address
  if (!addr) return ""
  const parts = [addr.address_1, addr.city, addr.province, addr.postal_code].filter(Boolean)
  return parts.join(", ")
}

const StepFulfilment: React.FC<Props> = ({ cart, shippingOptions }) => {
  const router = useRouter()
  const pickupOptions = getPickupOptions(shippingOptions)
  const deliveryOptions = getDeliveryOptions(shippingOptions)

  const currentShippingOptionId = cart.shipping_methods?.at(-1)?.shipping_option_id
  const currentPickup = pickupOptions.find((o) => o.id === currentShippingOptionId)

  const getInitialChoice = (): string => {
    if (currentPickup) return "pickup"
    return "delivery"
  }

  const [selected, setSelected] = useState<string>(getInitialChoice())
  const [selectedPickupId, setSelectedPickupId] = useState<string>(
    currentPickup?.id || pickupOptions[0]?.id || ""
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleContinue = async () => {
    if (isLoading) return
    setIsLoading(true)
    setError(null)

    try {
      if (selected === "pickup") {
        const pickupOption = pickupOptions.find((o) => o.id === selectedPickupId)
        if (pickupOption) {
          await setShippingMethod({ cartId: cart.id, shippingMethodId: pickupOption.id })

          // Snapshot the chosen pickup location to cart metadata so renames or
          // deletions don't change historical orders. Order confirmation, the
          // fulfilment queue, and admin order detail read from this snapshot.
          const loc = (pickupOption as any).service_zone?.fulfillment_set?.location
          const addr = loc?.address
          const snapshot = {
            shipping_option_id: pickupOption.id,
            location_id: loc?.id ?? null,
            name: loc?.name ?? pickupOption.name,
            address_line_1: addr?.address_1 ?? null,
            address_line_2: addr?.address_2 ?? null,
            city: addr?.city ?? null,
            province: addr?.province ?? null,
            postal_code: addr?.postal_code ?? null,
            country_code: addr?.country_code ?? null,
            snapshotted_at: new Date().toISOString(),
          }
          try {
            await updateCart({
              metadata: { ...(cart.metadata || {}), pickup_location: snapshot },
            } as any)
          } catch (e) {
            // Non-fatal — order can still proceed; admin will fall back to live lookup
            console.warn("[fulfilment] Failed to snapshot pickup location:", e)
          }
        }
        router.push("/checkout?step=payment")
      } else {
        // If a previous pickup snapshot exists on the cart, clear it.
        if ((cart.metadata as any)?.pickup_location) {
          try {
            const md = { ...(cart.metadata || {}) } as any
            delete md.pickup_location
            await updateCart({ metadata: md } as any)
          } catch {}
        }
        router.push("/checkout?step=address")
      }
    } catch (e: any) {
      setError(e.message || "Something went wrong")
      setIsLoading(false)
    }
  }

  const cheapestDeliveryPrice = deliveryOptions.length > 0
    ? Math.min(...deliveryOptions.map((o) => o.amount ?? 0))
    : 0

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-h1 text-hg-text mb-4">
          How should we get your beer to you?
        </h1>
        <p className="text-lg leading-relaxed text-hg-text-secondary">
          Choose the fulfilment method that best suits your lifestyle. Delivery for ultimate convenience, or pick up to meet the brewmasters.
        </p>
      </div>

      {error && <p className="text-sm text-hl-error mb-4">{error}</p>}

      <div className="grid grid-cols-1 gap-6">
        <label className="group relative block cursor-pointer">
          <input
            type="radio"
            name="fulfilment"
            checked={selected === "delivery"}
            onChange={() => setSelected("delivery")}
            className="peer sr-only"
          />
          <div className="p-8 bg-hg-surface border-2 border-hg-border rounded-xl transition-all duration-300 peer-checked:border-hg-gold peer-checked:bg-hg-gold/5 hover:border-hg-gold/50 group-active:scale-[0.98]">
            <div className="flex items-start justify-between">
              <div className="flex gap-6">
                <div className="w-16 h-16 rounded-xl bg-hl-surface3 flex items-center justify-center text-hg-gold transition-colors group-hover:bg-hg-gold/10">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="3" width="15" height="13" rx="2" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-hg-text mb-2">Home Delivery</h3>
                  <p className="text-sm text-hg-text-secondary max-w-[400px]">
                    Next-day chilled delivery in sustainable packaging. Tracking provided via SMS and email.
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-hg-gold uppercase tracking-widest">
                  Calculated on selection
                </span>
              </div>
            </div>
          </div>
          <div className="absolute -top-3 -right-3 opacity-0 peer-checked:opacity-100 transition-opacity">
            <div className="bg-hg-gold text-hg-on-primary p-1 rounded-full shadow-lg">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
          </div>
        </label>

        {pickupOptions.length > 0 && (
          <label className="group relative block cursor-pointer">
            <input
              type="radio"
              name="fulfilment"
              checked={selected === "pickup"}
              onChange={() => setSelected("pickup")}
              className="peer sr-only"
            />
            <div className="p-8 bg-hg-surface border-2 border-hg-border rounded-xl transition-all duration-300 peer-checked:border-hg-gold peer-checked:bg-hg-gold/5 hover:border-hg-gold/50 group-active:scale-[0.98]">
              <div className="flex items-start justify-between">
                <div className="flex gap-6">
                  <div className="w-16 h-16 rounded-xl bg-hl-surface3 flex items-center justify-center text-hg-gold transition-colors group-hover:bg-hg-gold/10">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold text-hg-text mb-2">In-Store Pickup</h3>
                    <p className="text-sm text-hg-text-secondary max-w-[400px]">
                      Collect from our store. Ready for pickup within 2 hours of ordering.
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-hl-accent">FREE</span>
                  <p className="text-[10px] text-hg-text-secondary uppercase mt-1 tracking-widest">Collector Perk</p>
                </div>
              </div>

              {selected === "pickup" && (
                <div className="mt-6 pt-6 border-t border-hg-border/30">
                  <p className="text-xs font-semibold text-hg-text-secondary uppercase tracking-widest mb-4">Choose a Location</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {pickupOptions.map((option) => {
                      const isActive = selectedPickupId === option.id
                      const address = formatLocationAddress(option)
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedPickupId(option.id) }}
                          className={`text-left p-4 rounded-lg border-2 transition-all ${isActive ? "border-hg-gold bg-hg-gold/10" : "border-hg-border/50 hover:border-hg-gold/40"}`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-sm text-hg-text">{option.name}</p>
                              {address && <p className="text-xs text-hg-text-secondary mt-1">{address}</p>}
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-3 mt-0.5 ${isActive ? "border-hg-gold bg-hg-gold" : "border-hg-border"}`}>
                              {isActive && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-hg-on-primary"><polyline points="20 6 9 17 4 12" /></svg>}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="absolute -top-3 -right-3 opacity-0 peer-checked:opacity-100 transition-opacity">
              <div className="bg-hg-gold text-hg-on-primary p-1 rounded-full shadow-lg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
            </div>
          </label>
        )}
      </div>

      <div className="mt-12 pt-6 border-t border-hg-border/30 flex justify-end">
        <button
          onClick={handleContinue}
          disabled={isLoading}
          className="px-8 py-3.5 bg-hg-gold text-hg-bg font-bold text-sm rounded-full transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 flex items-center gap-2"
        >
          {isLoading ? "Processing..." : selected === "pickup" ? "Continue to Payment" : "Continue to Address"}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>
    </div>
  )
}

export default StepFulfilment
