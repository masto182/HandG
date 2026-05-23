import { clx } from "@modules/common/components/ui"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type LineItemPriceProps = {
  currencyCode: string
  item?: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
  originalPrice?: number | null
  adjustedPrice?: number | null
  style?: "tight" | "default"
  className?: string
  "data-testid"?: string
}

export default function LineItemPrice({
  currencyCode,
  item,
  originalPrice: originalPriceProp,
  adjustedPrice: adjustedPriceProp,
  style,
  className,
  "data-testid": dataTestid,
}: LineItemPriceProps) {
  const originalPrice = originalPriceProp ?? (item ? (item as any).original_total ?? (item as any).unit_price * (item as any).quantity : null)
  const adjustedPrice = adjustedPriceProp ?? (item ? (item as any).total ?? (item as any).subtotal ?? originalPrice : null)

  const hasDiscount = originalPrice && adjustedPrice && adjustedPrice < originalPrice

  return (
    <div className={clx("flex items-center gap-2", style === "tight" && "gap-1", className)} data-testid={dataTestid}>
      {hasDiscount && (
        <span className="text-body-sm text-on-surface-variant line-through">
          {convertToLocale({ amount: originalPrice, currency_code: currencyCode })}
        </span>
      )}
      <span className="text-price text-price-dark font-bold">
        {convertToLocale({
          amount: adjustedPrice ?? originalPrice ?? 0,
          currency_code: currencyCode,
        })}
      </span>
    </div>
  )
}
