import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@modules/common/components/ui"

type LineItemUnitPriceProps = {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
  style?: "default" | "tight"
  currencyCode: string
}

const LineItemUnitPrice = ({
  item,
  style = "default",
  currencyCode,
}: LineItemUnitPriceProps) => {
  const total = item.total ?? 0
  const original_total = item.original_total ?? 0
  const hasReducedPrice = total < original_total

  const percentage_diff = Math.round(
    ((original_total - total) / original_total) * 100
  )

  return (
    <div className="flex flex-col text-hg-text-secondary justify-center h-full">
      {hasReducedPrice && (
        <>
          <p>
            {style === "default" && (
              <span className="text-hg-text-secondary">Original: </span>
            )}
            <span
              className="line-through"
              data-testid="product-unit-original-price"
            >
              {convertToLocale({
                amount: original_total / item.quantity,
                currency_code: currencyCode,
              })}
            </span>
          </p>
          {style === "default" && (
            <span className="text-hg-gold">-{percentage_diff}%</span>
          )}
        </>
      )}
      <span
        className={clx("text-base-regular", {
          "text-hg-gold": hasReducedPrice,
        })}
        data-testid="product-unit-price"
      >
        {convertToLocale({
          amount: total / item.quantity,
          currency_code: currencyCode,
        })}
      </span>
    </div>
  )
}

export default LineItemUnitPrice
