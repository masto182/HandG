"use client"

import { updateLineItem } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import ErrorMessage from "@modules/checkout/components/error-message"
import DeleteButton from "@modules/common/components/delete-button"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "@modules/products/components/thumbnail"
import Icon from "@modules/common/components/icon"
import { useState } from "react"

type ItemProps = {
  item: HttpTypes.StoreCartLineItem
  type?: "full" | "preview"
  currencyCode: string
  maxStock?: number
}

const Item = ({ item, type = "full", currencyCode, maxStock }: ItemProps) => {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const changeQuantity = async (quantity: number) => {
    setError(null)
    setUpdating(true)

    await updateLineItem({
      lineId: item.id,
      quantity,
    })
      .catch((err) => {
        setError(err.message)
      })
      .finally(() => {
        setUpdating(false)
      })
  }

  const inventoryQuantity = maxStock ?? (item.variant as any)?.inventory_quantity ?? (item.variant as any)?.inventory?.quantity
  const maxQuantity = inventoryQuantity != null && inventoryQuantity > 0
    ? inventoryQuantity
    : 99

  const productMeta = (item as any).product?.metadata || (item.variant?.product as any)?.metadata
  const brewery = productMeta?.brewery_name || productMeta?.brewery || item.product_collection || item.product_subtitle

  return (
    <div
      className="bg-surface-container rounded-xl p-5 border border-outline-variant flex gap-5 items-start"
      data-testid="product-row"
    >
      <LocalizedClientLink
        href={`/products/${item.product_handle}`}
        className="w-20 h-20 rounded-lg bg-surface-container-high flex-shrink-0 overflow-hidden"
      >
        <Thumbnail
          thumbnail={item.thumbnail}
          images={item.variant?.product?.images}
          size="square"
        />
      </LocalizedClientLink>

      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            {brewery && (
              <p className="text-label-caps uppercase tracking-[0.05em] text-on-surface-variant mb-1 truncate">
                {brewery}
              </p>
            )}
            <h3 className="text-body-md font-semibold text-on-surface truncate" data-testid="product-title">
              {item.product_title}
            </h3>
          </div>
          <span className="text-price text-hg-gold flex-shrink-0">
            <LineItemPrice item={item} style="tight" currencyCode={currencyCode} />
          </span>
        </div>

        <LineItemOptions variant={item.variant} data-testid="product-variant" />

        {type === "full" && (
          <div className="flex justify-between items-center mt-3">
            <div className="flex items-center bg-surface-container-low rounded-lg border border-outline-variant overflow-hidden">
              <button
                type="button"
                onClick={() => item.quantity > 1 && changeQuantity(item.quantity - 1)}
                disabled={updating || item.quantity <= 1}
                className="px-2.5 py-1.5 hover:bg-hg-surface-hover transition-colors disabled:opacity-40"
              >
                <Icon name="remove" size={16} />
              </button>
              <span className="px-3 text-sm font-bold text-on-surface min-w-[32px] text-center" data-testid="product-select-button">
                {item.quantity}
              </span>
              <button
                type="button"
                onClick={() => item.quantity < maxQuantity && changeQuantity(item.quantity + 1)}
                disabled={updating || item.quantity >= maxQuantity}
                className="px-2.5 py-1.5 hover:bg-hg-surface-hover transition-colors disabled:opacity-40"
              >
                <Icon name="add" size={16} />
              </button>
            </div>
            <DeleteButton
              id={item.id}
              className="text-on-surface-variant hover:text-hl-error transition-colors"
              data-testid="product-delete-button"
            />
          </div>
        )}

        {type === "preview" && (
          <span className="text-sm text-on-surface-variant">Qty: {item.quantity}</span>
        )}

        <ErrorMessage error={error} data-testid="product-error-message" />
      </div>
    </div>
  )
}

export default Item
