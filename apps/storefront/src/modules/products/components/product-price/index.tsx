import { clx } from "@modules/common/components/ui"

import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"

export default function ProductPrice({
  product,
  variant,
}: {
  product: HttpTypes.StoreProduct
  variant?: HttpTypes.StoreProductVariant
}) {
  const { cheapestPrice, variantPrice } = getProductPrice({
    product,
    variantId: variant?.id,
  })

  const selectedPrice = variant ? variantPrice : cheapestPrice

  if (!selectedPrice) {
    return <div className="block w-32 h-9 bg-surface-container-high animate-pulse rounded-lg" />
  }

  return (
    <div className="flex flex-col">
      <span
        className={clx("text-4xl font-bold text-hl-price", {
          "text-hl-accent": selectedPrice.price_type === "sale",
        })}
      >
        {!variant && "From "}
        <span
          data-testid="product-price"
          data-value={selectedPrice.calculated_price_number}
        >
          {selectedPrice.calculated_price}
        </span>
      </span>
      {selectedPrice.price_type === "sale" && (
        <div className="flex items-center gap-2 mt-1">
          <span
            className="line-through text-on-surface-variant text-sm"
            data-testid="original-product-price"
            data-value={selectedPrice.original_price_number}
          >
            {selectedPrice.original_price}
          </span>
          <span className="text-hl-accent text-sm font-semibold">
            -{selectedPrice.percentage_diff}%
          </span>
        </div>
      )}
    </div>
  )
}
