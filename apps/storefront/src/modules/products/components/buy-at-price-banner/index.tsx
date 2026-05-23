import React from "react"

type BuyAtPriceBannerProps = {
  offerPrice: number
  currencyCode: string
  expiresAt: string | null
}

const fmt = (n: number, ccy: string) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: ccy.toUpperCase(),
  }).format(n)

export default function BuyAtPriceBanner({
  offerPrice,
  currencyCode,
  expiresAt,
}: BuyAtPriceBannerProps) {
  let expiresLabel: string | null = null
  if (expiresAt) {
    const days = Math.max(
      0,
      Math.ceil(
        (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    )
    expiresLabel = days === 0 ? "Expires today" : `Expires in ${days}d`
  }

  return (
    <div
      data-testid="buy-at-price-banner"
      className="rounded-lg border border-hg-gold/40 bg-hg-gold/10 p-4 flex items-center justify-between gap-4"
    >
      <div>
        <div className="text-[11px] uppercase tracking-wider text-hg-gold font-bold">
          Your accepted offer
        </div>
        <div className="text-2xl font-bold text-hg-gold mt-1">
          {fmt(offerPrice, currencyCode)}
        </div>
      </div>
      {expiresLabel && (
        <div className="text-xs text-hg-text-muted">{expiresLabel}</div>
      )}
    </div>
  )
}
