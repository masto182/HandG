"use client"
import { HttpTypes } from "@medusajs/types"
import { convertToLocale } from "@lib/util/money"
import { PAYID_ALIAS } from "@lib/constants/payment"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useState } from "react"

type Props = {
  cart: HttpTypes.StoreCart
}

const StepConfirm: React.FC<Props> = ({ cart }) => {
  const [copied, setCopied] = useState<string | null>(null)

  const orderNumber = `HG-${Date.now().toString(36).toUpperCase().slice(-7)}0`
  const payidEmail = PAYID_ALIAS
  const total = cart.total ?? 0
  const currencyCode = cart.currency_code || "aud"

  const paymentSession = cart.payment_collection?.payment_sessions?.find((s) => s.status === "pending")
  const isPayid = paymentSession?.provider_id?.includes("payid")

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="max-w-[600px] mx-auto py-12">
      <div className="text-center mb-12">
        <div className="w-20 h-20 rounded-full bg-hg-gold/20 flex items-center justify-center mx-auto mb-6">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-hg-gold">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h1 className="text-[40px] font-bold leading-[1.1] tracking-[-0.03em] text-hg-text mb-3">
          Thank You for Your Order
        </h1>
        <p className="text-lg text-hg-text-secondary">
          Your selection of premium craft brews is being prepared for shipping.
        </p>
      </div>

      <div className="bg-hg-surface border border-hg-border rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-[10px] text-hg-text-secondary uppercase tracking-widest">Order Number</p>
            <p className="text-2xl font-bold text-hg-text mt-1">#{orderNumber}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-[10px] text-hg-text-secondary uppercase tracking-widest">Order Total</p>
            <p className="text-2xl font-bold text-hg-gold mt-1">
              {convertToLocale({ amount: total, currency_code: currencyCode })} AUD
            </p>
          </div>
          {isPayid && (
            <div className="border border-hg-gold/50 rounded-full px-3 py-1">
              <span className="text-[10px] font-semibold text-hg-gold uppercase tracking-widest">Order Pending PayID</span>
            </div>
          )}
        </div>
      </div>

      {isPayid && (
        <div className="bg-hg-surface border border-hg-border rounded-xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-hg-gold"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
            <h2 className="text-xl font-bold text-hg-text">PayID Transfer Instructions</h2>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-hg-bg border border-hg-border rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-6 h-6 rounded-full bg-hg-gold/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-hg-gold">1</span>
                </div>
                <h3 className="font-semibold text-sm text-hg-text">Login to your banking app</h3>
              </div>
              <p className="text-sm text-hg-text-secondary ml-9">Select &apos;Pay Someone&apos; and choose PayID as the payment method.</p>
            </div>

            <div className="p-4 bg-hg-bg border border-hg-border rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-6 h-6 rounded-full bg-hg-gold/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-hg-gold">2</span>
                </div>
                <h3 className="font-semibold text-sm text-hg-text">Enter PayID Details</h3>
              </div>
              <div className="ml-9 mt-2 flex items-center justify-between p-3 bg-hg-surface border border-hg-border rounded-lg">
                <span className="text-sm font-bold text-hg-gold">{payidEmail}</span>
                <button onClick={() => copyToClipboard(payidEmail, "email")} className="text-hg-text-secondary hover:text-hg-gold transition-colors">
                  {copied === "email" ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-hg-gold"><polyline points="20 6 9 17 4 12" /></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>}
                </button>
              </div>
            </div>

            <div className="p-4 bg-hg-bg border border-hg-border rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-6 h-6 rounded-full bg-hg-gold/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-hg-gold">3</span>
                </div>
                <h3 className="font-semibold text-sm text-hg-text">Include Order Reference</h3>
              </div>
              <div className="ml-9 mt-2 flex items-center justify-between p-3 bg-hg-surface border border-hg-border rounded-lg">
                <span className="text-sm font-bold text-hg-text">{orderNumber}</span>
                <button onClick={() => copyToClipboard(orderNumber, "ref")} className="text-hg-text-secondary hover:text-hg-gold transition-colors">
                  {copied === "ref" ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-hg-gold"><polyline points="20 6 9 17 4 12" /></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>}
                </button>
              </div>
            </div>
          </div>

          <p className="text-xs text-hg-text-muted italic mt-6 text-center">
            Orders are typically verified and moved to &apos;Fulfilment&apos; within 1-2 business hours of payment receipt.
          </p>
        </div>
      )}

      <div className="flex items-center justify-center gap-4">
        <LocalizedClientLink
          href="/store"
          className="px-8 py-4 bg-hg-gold text-hg-on-primary font-semibold text-[12px] uppercase tracking-[0.1em] rounded-lg transition-transform hover:scale-105 active:scale-95 shadow-lg inline-flex items-center gap-2"
        >
          Return to Store →
        </LocalizedClientLink>
        <button
          onClick={() => window.print()}
          className="px-8 py-4 bg-hg-surface border border-hg-border text-hg-text font-semibold text-[12px] uppercase tracking-[0.1em] rounded-lg transition-colors hover:border-hl-border-strong inline-flex items-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
          Print Receipt
        </button>
      </div>
    </div>
  )
}

export default StepConfirm
