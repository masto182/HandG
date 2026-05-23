"use client"
import { initiatePaymentSession } from "@lib/data/cart"
import { isManual, isPayId } from "@lib/constants"
import { PAYID_ALIAS } from "@lib/constants/payment"
import { HttpTypes } from "@medusajs/types"
import { useRouter } from "next/navigation"
import { useState } from "react"

type Props = {
  cart: HttpTypes.StoreCart
  paymentMethods: { id: string }[] | null
  isPickup: boolean
}

const StepPayment: React.FC<Props> = ({ cart, paymentMethods, isPickup }) => {
  const router = useRouter()
  const activeSession = cart.payment_collection?.payment_sessions?.find(
    (s) => s.status === "pending"
  )

  const filteredMethods = (paymentMethods ?? []).filter((pm) => {
    if (isPickup) return true
    return isPayId(pm.id)
  })

  const defaultSelected = activeSession?.provider_id ??
    (!isPickup && filteredMethods.length === 1 ? filteredMethods[0]?.id ?? "" : "")

  const [selected, setSelected] = useState<string>(defaultSelected)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const handleContinue = async () => {
    if (!selected || isLoading) return
    setIsLoading(true)
    setError(null)
    try {
      if (activeSession?.provider_id !== selected) {
        await initiatePaymentSession(cart, { provider_id: selected })
      }
      router.push("/checkout?step=review")
    } catch (e: any) {
      setError(e.message || "Failed to set payment method")
      setIsLoading(false)
    }
  }

  const backHref = isPickup ? "/checkout?step=fulfilment" : "/checkout?step=shipping"

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  const payidSession = cart.payment_collection?.payment_sessions?.find(
    (s) => s.provider_id === "payid"
  )
  const payidData = (payidSession?.data ?? {}) as {
    payid_alias?: string
    reference?: string
  }
  const payidEmail = payidData.payid_alias || PAYID_ALIAS
  const referenceCode =
    payidData.reference ||
    (cart.id ? `HG-${cart.id.replace(/[^A-Z0-9]/gi, "").slice(-8).toUpperCase()}` : "HG-PENDING")

  const isPayidSelected = isPayId(selected)
  const isCashSelected = isManual(selected)

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-h1 text-hg-text">
          Payment Options
        </h1>
      </div>

      {error && <p className="text-sm text-hl-error mb-4">{error}</p>}

      {filteredMethods.length > 1 && (
        <div className="flex gap-4 mb-8">
          {filteredMethods.map((pm) => {
            const isPayid = isPayId(pm.id)
            const isActive = selected === pm.id

            return (
              <button
                key={pm.id}
                type="button"
                onClick={() => setSelected(pm.id)}
                className={`flex-1 flex items-center gap-4 p-5 border-2 rounded-xl transition-all ${isActive ? "border-hg-gold bg-hg-gold/5" : "border-hg-border hover:border-hg-gold/50"}`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isActive ? "bg-hg-gold/20 text-hg-gold" : "bg-hl-surface3 text-hg-text-secondary"}`}>
                  {isPayid ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                  )}
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-semibold text-hg-text">{isPayid ? "PayID Transfer" : "Cash on Pickup"}</h3>
                  <p className="text-xs text-hg-text-secondary">{isPayid ? "Instant bank transfer" : "Pay with cash at pickup"}</p>
                </div>
                {isActive && (
                  <div className="ml-auto">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-hg-gold"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      {isPayidSelected && (
        <div className="bg-hg-surface border border-hg-border rounded-xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-hg-gold"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
            <div>
              <h3 className="text-xl font-bold text-hg-text">PayID Payment Details</h3>
              <p className="text-sm text-hg-text-secondary">Please use the details below in your banking app.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-hg-bg rounded-lg border border-hg-border">
              <div>
                <p className="font-semibold text-[10px] text-hg-text-secondary uppercase tracking-widest">PayID Type</p>
                <p className="text-base font-bold text-hg-text mt-1">ABN / Business Email</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-hg-gold"><polyline points="20 6 9 17 4 12" /></svg>
            </div>

            <div className="flex items-center justify-between p-4 bg-hg-bg rounded-lg border border-hg-border">
              <div>
                <p className="font-semibold text-[10px] text-hg-text-secondary uppercase tracking-widest">PayID Identifier</p>
                <p className="text-base font-bold text-hg-gold mt-1">{payidEmail}</p>
              </div>
              <button onClick={() => copyToClipboard(payidEmail, "email")} className="text-hg-text-secondary hover:text-hg-gold transition-colors">
                {copied === "email" ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-hg-gold"><polyline points="20 6 9 17 4 12" /></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-hg-bg rounded-lg border border-hg-border">
              <div>
                <p className="font-semibold text-[10px] text-hg-text-secondary uppercase tracking-widest">Reference Code</p>
                <p className="text-base font-bold text-hg-text mt-1">{referenceCode}</p>
              </div>
              <button onClick={() => copyToClipboard(referenceCode, "ref")} className="text-hg-text-secondary hover:text-hg-gold transition-colors">
                {copied === "ref" ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-hg-gold"><polyline points="20 6 9 17 4 12" /></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="text-center">
              <span className="text-2xl font-bold text-hg-text-muted">01</span>
              <p className="text-xs text-hg-text-secondary mt-2">Log into your mobile banking app or online portal.</p>
            </div>
            <div className="text-center">
              <span className="text-2xl font-bold text-hg-text-muted">02</span>
              <p className="text-xs text-hg-text-secondary mt-2">Select &apos;Pay Someone&apos; using PayID and enter the details above.</p>
            </div>
            <div className="text-center">
              <span className="text-2xl font-bold text-hg-text-muted">03</span>
              <p className="text-xs text-hg-text-secondary mt-2">Enter exact amount and reference {referenceCode}.</p>
            </div>
          </div>

          <div className="mt-6 flex items-start gap-3 p-4 bg-hg-bg rounded-lg border border-hg-border">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-hg-gold shrink-0 mt-0.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            <p className="text-xs text-hg-text-secondary">Your items are held for 24 hours while payment is processed. If payment is received after this time, your items may still be allocated but could be out of stock. Payment details will be included in your order confirmation email.</p>
          </div>
        </div>
      )}

      {isCashSelected && (
        <div className="bg-hg-surface border border-hg-border rounded-xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-hg-gold"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
            <h3 className="text-xl font-bold text-hg-text">Cash on Pickup</h3>
          </div>
          <p className="text-sm text-hg-text-secondary">Pay with cash when you collect your order. Payment is due at pickup.</p>
          <div className="mt-4 flex items-start gap-3 p-4 bg-hg-bg rounded-lg border border-hg-border">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-hg-gold shrink-0 mt-0.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            <p className="text-xs text-hg-text-secondary">Your items are held for 24 hours. Please collect and pay within this time. After 24 hours, items may still be available but could be out of stock.</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-4">
        <a href={backHref} className="flex items-center gap-2 text-sm text-hg-text-secondary hover:text-hg-text transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          Back to {isPickup ? "Fulfilment" : "Shipping"}
        </a>
        <button
          onClick={handleContinue}
          disabled={!selected || isLoading}
          className="px-10 py-4 bg-hg-gold text-hg-on-primary font-semibold text-[12px] uppercase tracking-[0.1em] rounded-lg transition-transform hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50"
        >
          {isLoading ? "Processing..." : "I Understand Payment Terms"}
        </button>
      </div>


    </div>
  )
}

export default StepPayment
