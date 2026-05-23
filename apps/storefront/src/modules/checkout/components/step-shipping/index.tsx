"use client"
import { setShippingMethod } from "@lib/data/cart"
import {
  getCarrierRates,
  type CarrierRate,
  type CarrierRateGroup,
  type CarrierRatesResponse,
} from "@lib/data/fulfillment"
import { getDeliveryOptions } from "@lib/util/shipping"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"

type Props = {
  cart: HttpTypes.StoreCart
  shippingOptions: HttpTypes.StoreCartShippingOption[] | null
}

function estimateDeliveryDays(rate: CarrierRate): number {
  if (rate.data.delivery_days != null) return rate.data.delivery_days
  if (rate.service_tier === "express") return 2
  return 4
}

function arrivalEstimate(rate: CarrierRate): string {
  const days = estimateDeliveryDays(rate)
  const start = new Date()
  start.setDate(start.getDate() + Math.max(1, days - 1))
  const end = new Date()
  end.setDate(end.getDate() + days + 1)
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-AU", { weekday: "short", month: "short", day: "numeric" })
  return `${fmt(start)} — ${fmt(end)}`
}

function rateDescription(rate: CarrierRate): string {
  if (rate.delivery_behaviour === "leave_at_door") return "No signature required"
  if (rate.delivery_behaviour === "signature") return "Signature required on delivery"
  if (rate.service_tier === "express") return "Priority handling & dispatch"
  if (rate.provider_id === "auspost") return "Reliable nationwide network"
  return "Standard courier handling"
}

const StepShipping: React.FC<Props> = ({ cart, shippingOptions }) => {
  const router = useRouter()
  const deliveryOptions = getDeliveryOptions(shippingOptions)

  const optionByProvider: Record<string, string | undefined> = useMemo(
    () => ({
      shipengine: deliveryOptions.find(
        (o: any) => o.provider_id?.includes("shipengine") || o.name?.includes("ShipEngine"),
      )?.id,
      auspost: deliveryOptions.find(
        (o: any) => o.provider_id?.includes("auspost") || o.name?.toLowerCase().includes("australia post"),
      )?.id,
    }),
    [deliveryOptions],
  )

  const [response, setResponse] = useState<CarrierRatesResponse | null>(null)
  const [isLoadingRates, setIsLoadingRates] = useState(true)

  // Per-row signature toggles, keyed by base row id. When true, the effective
  // selection swaps to that row's signature_sibling.rate_id.
  const [signatureToggles, setSignatureToggles] = useState<Record<string, boolean>>({})

  // selected = the BASE row id; effective rate is derived through the toggle map.
  const [selected, setSelected] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoadingRates(true)
    getCarrierRates(cart.id).then((res) => {
      if (cancelled) return
      setResponse(res)
      setIsLoadingRates(false)
      const stillThere = res.groups.some((g) => g.rates.some((r) => r.id === selected))
      if (!stillThere) {
        setSelected(res.best_price_rate_id ?? res.groups[0]?.rates[0]?.id ?? null)
      }
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.id])

  const ratesById = useMemo(() => {
    const m = new Map<string, CarrierRate>()
    for (const r of response?.rates ?? []) m.set(r.id, r)
    return m
  }, [response])

  const effectiveRateId = (baseId: string | null): string | null => {
    if (!baseId) return null
    const base = ratesById.get(baseId)
    if (!base) return baseId
    if (signatureToggles[baseId] && base.signature_sibling) {
      return base.signature_sibling.rate_id
    }
    return baseId
  }

  const selectedRate = response?.rates.find((r) => r.id === effectiveRateId(selected)) ?? null

  // Persist current rate to cart so the sidebar reflects the live amount.
  // Called on radio click and SoD toggle. Last call wins.
  const inflight = useRef<Promise<void> | null>(null)
  const persistRate = async (baseId: string, sigOn: boolean) => {
    const base = ratesById.get(baseId)
    if (!base) return
    const eff =
      sigOn && base.signature_sibling
        ? ratesById.get(base.signature_sibling.rate_id) ?? base
        : base
    const optionId = optionByProvider[eff.provider_id]
    if (!optionId) {
      setError(`No shipping option configured for provider "${eff.provider_id}"`)
      return
    }
    setError(null)
    const p = (async () => {
      try {
        await setShippingMethod({
          cartId: cart.id,
          shippingMethodId: optionId,
          data: {
            rate_id: eff.data.rate_id,
            carrier_id: eff.data.carrier_id,
            carrier_code: eff.data.carrier_code,
            service_code: eff.data.service_code,
            amount: eff.amount,
            rate_quoted_at: eff.data.rate_quoted_at,
            provider_id: eff.provider_id,
            force_sod: eff.delivery_behaviour === "signature",
            service_display_name: eff.name,
            carrier_display_name: eff.carrier_display_name,
          },
        })
        router.refresh()
      } catch (e: any) {
        setError(e.message || "Failed to set shipping method")
      }
    })()
    inflight.current = p
    await p
  }

  const handleSelect = (baseId: string) => {
    setSelected(baseId)
    void persistRate(baseId, !!signatureToggles[baseId])
  }

  const toggleSignature = (baseId: string, on: boolean) => {
    setSignatureToggles((prev) => ({ ...prev, [baseId]: on }))
    if (selected === baseId) {
      void persistRate(baseId, on)
    }
  }

  const handleContinue = async () => {
    if (!selected || !selectedRate || isLoading) return
    setIsLoading(true)
    setError(null)
    try {
      // Defensive: ensure latest selection is committed before navigating.
      await persistRate(selected, !!signatureToggles[selected])
      router.push("/checkout?step=payment")
    } catch (e: any) {
      setError(e.message || "Failed to set shipping method")
      setIsLoading(false)
    }
  }

  const handleRetry = () => {
    setError(null)
    setIsLoadingRates(true)
    getCarrierRates(cart.id).then((res) => {
      setResponse(res)
      setIsLoadingRates(false)
    })
  }

  const groups: CarrierRateGroup[] = response?.groups ?? []
  const visibleRows = useMemo(() => {
    const out: CarrierRate[] = []
    for (const g of groups) for (const r of g.rates) out.push(r)
    return out
  }, [groups])

  // Cheapest visible row given current toggles.
  const bestPriceBaseId = useMemo(() => {
    if (!visibleRows.length) return null
    let bestId: string | null = null
    let bestAmount = Infinity
    for (const base of visibleRows) {
      const eff = ratesById.get(effectiveRateId(base.id) ?? base.id)
      if (!eff) continue
      if (eff.amount < bestAmount) {
        bestAmount = eff.amount
        bestId = base.id
      }
    }
    return bestId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleRows, signatureToggles, ratesById])

  // Fastest visible row (smallest delivery_days). On ties, first wins.
  const fastestBaseId = useMemo(() => {
    if (!visibleRows.length) return null
    let bestId: string | null = null
    let bestDays = Infinity
    for (const base of visibleRows) {
      const d = estimateDeliveryDays(base)
      if (d < bestDays) {
        bestDays = d
        bestId = base.id
      }
    }
    return bestId
  }, [visibleRows])

  return (
    <div>
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-h1 text-hg-text mb-4 tracking-tight">How shall we send your haul?</h1>
        <p className="text-lg leading-relaxed text-hg-text-secondary max-w-[650px]">
          Select a delivery speed that ensures your haul arrives in peak condition. All shipments
          are handled by specialists trained in the transport of premium craft beverages.
        </p>
      </header>

      {error && <p className="text-sm text-hl-error mb-4">{error}</p>}

      {/* Loading shimmer */}
      {isLoadingRates && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-hg-surface/40 backdrop-blur-md border border-white/10 animate-pulse"
            >
              <div className="flex items-center gap-6">
                <div className="w-6 h-6 rounded-full bg-hg-border shrink-0" />
                <div className="flex-1">
                  <div className="h-4 w-48 bg-hg-border rounded mb-2" />
                  <div className="h-3 w-32 bg-hg-border/60 rounded" />
                </div>
                <div className="h-5 w-20 bg-hg-border rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoadingRates && groups.length === 0 && (
        <div className="p-6 rounded-xl bg-hg-surface/40 backdrop-blur-md border border-white/10 text-center">
          <p className="text-sm text-hg-text-secondary mb-3">
            Unable to get live shipping rates for your address. Please check your address details
            or try again.
          </p>
          <button onClick={handleRetry} className="text-sm text-hg-gold hover:underline">
            Retry
          </button>
        </div>
      )}

      {/* Carrier groups */}
      {!isLoadingRates && groups.length > 0 && (
        <div className="flex flex-col gap-8">
          {groups.map((group) => (
            <div key={group.carrier_group}>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.2em] text-hg-text">
                  {group.carrier_display_name}
                </h3>
                <div className="h-px flex-grow bg-white/5" />
              </div>

              <div className="flex flex-col gap-3">
                {group.rates.map((rate) => {
                  const isSelected = selected === rate.id
                  const isBest = rate.id === bestPriceBaseId
                  const isFastest = !isBest && rate.id === fastestBaseId
                  const sigOn = !!signatureToggles[rate.id]
                  const sib = rate.signature_sibling
                  const displayedAmount = sigOn && sib ? sib.amount : rate.amount

                  return (
                    <label
                      key={rate.id}
                      className={`relative block p-4 rounded-xl bg-hg-surface/40 backdrop-blur-md border cursor-pointer transition-all group ${
                        isSelected
                          ? "border-hg-gold bg-hg-gold/5"
                          : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      <input
                        type="radio"
                        name="shipping"
                        checked={isSelected}
                        onChange={() => handleSelect(rate.id)}
                        className="sr-only"
                      />

                      {isBest && (
                        <div className="absolute top-0 right-8 -translate-y-1/2 bg-hg-gold text-hg-bg text-[10px] px-3 py-1 rounded-full uppercase font-bold tracking-widest shadow-lg">
                          Recommended
                        </div>
                      )}
                      {isFastest && (
                        <div className="absolute top-0 right-8 -translate-y-1/2 bg-[#b6d247] text-[#2a3400] text-[10px] px-3 py-1 rounded-full uppercase font-bold tracking-widest shadow-lg">
                          Fastest
                        </div>
                      )}

                      <div className="flex items-start gap-6">
                        {/* Radio dot */}
                        <div
                          className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? "border-hg-gold" : "border-hg-border group-hover:border-hg-gold/50"
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2.5 h-2.5 rounded-full bg-hg-gold shadow-[0_0_10px_rgba(99,169,135,0.5)]" />
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] flex-grow gap-4 md:gap-10 md:items-center w-full">
                          <div>
                            <div className="text-base font-bold text-hg-text">{rate.name}</div>
                            <div className="text-sm text-hg-text-secondary mt-1">
                              {rateDescription(rate)}
                            </div>

                            {/* Inline iOS-style SoD toggle (only when sibling exists) */}
                            {sib && (
                              <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                                <span className="text-[10px] text-hg-text-secondary uppercase tracking-wider">
                                  Add Signature on Delivery
                                  {sib.delta_cents > 0 && (
                                    <>
                                      {" "}(+
                                      {convertToLocale({
                                        amount: sib.delta_cents / 100,
                                        currency_code: rate.currency_code,
                                      })}
                                      )
                                    </>
                                  )}
                                </span>
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={sigOn}
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    toggleSignature(rate.id, !sigOn)
                                  }}
                                  className={`relative inline-flex w-9 h-5 rounded-full transition-colors shrink-0 ${
                                    sigOn ? "bg-hg-gold" : "bg-hg-border"
                                  }`}
                                >
                                  <span
                                    className={`absolute top-[2px] left-[2px] w-4 h-4 bg-white rounded-full transition-transform ${
                                      sigOn ? "translate-x-4" : ""
                                    }`}
                                  />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Arrival estimate */}
                          <div className="md:text-right">
                            <div className="text-[10px] text-hg-text-secondary uppercase mb-1 tracking-wider">
                              Arrival Estimate
                            </div>
                            <div className="text-sm text-hg-text font-medium">
                              {arrivalEstimate(rate)}
                            </div>
                          </div>

                          {/* Price */}
                          <div className="md:text-right md:min-w-[100px]">
                            <div
                              className={`text-xl font-bold ${
                                isSelected ? "text-hg-gold" : "text-hg-text"
                              }`}
                            >
                              {convertToLocale({
                                amount: displayedAmount / 100,
                                currency_code: rate.currency_code,
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Insurance summary line (kept; full Protection section intentionally omitted) */}
          {selectedRate && (
            <p className="text-xs text-hg-text-secondary text-center pt-4">
              {selectedRate.provider_id === "auspost" && selectedRate.data.cover_total_aud ? (
                <>
                  Parcel cover: $
                  {selectedRate.data.cover_total_aud.toLocaleString("en-AU", {
                    minimumFractionDigits: 0,
                  })}{" "}
                  included with this option. Extra cover available at lodgement &mdash; email{" "}
                  <a href="mailto:aus.beers@gmail.com" className="text-hg-gold hover:underline">
                    aus.beers@gmail.com
                  </a>{" "}
                  for pricing.
                </>
              ) : selectedRate.provider_id === "auspost" ? (
                <>
                  No parcel cover included on this option. Extra cover available at lodgement
                  &mdash; email{" "}
                  <a href="mailto:aus.beers@gmail.com" className="text-hg-gold hover:underline">
                    aus.beers@gmail.com
                  </a>{" "}
                  for pricing.
                </>
              ) : (
                <>
                  Extra insurance cover available at lodgement &mdash; email{" "}
                  <a href="mailto:aus.beers@gmail.com" className="text-hg-gold hover:underline">
                    aus.beers@gmail.com
                  </a>{" "}
                  for pricing.
                </>
              )}
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="mt-10 flex items-center justify-between border-t border-white/5 pt-6">
        <a
          href="/checkout?step=address"
          className="flex items-center gap-2 text-[12px] uppercase tracking-widest text-hg-text-secondary hover:text-hg-gold transition-colors group"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="group-hover:-translate-x-1 transition-transform"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Return to Address
        </a>
        <button
          onClick={handleContinue}
          disabled={!selected || isLoading || isLoadingRates}
          className="bg-hg-gold text-hg-bg uppercase px-12 py-4 rounded-full text-[12px] font-black tracking-[0.2em] shadow-xl shadow-hg-gold/10 hover:shadow-hg-gold/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
        >
          {isLoading ? "Processing…" : "Proceed to Payment"}
        </button>
      </footer>
    </div>
  )
}

export default StepShipping
