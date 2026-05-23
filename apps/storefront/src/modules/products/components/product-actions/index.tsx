"use client"

import { addToCart } from "@lib/data/cart"
import { useIntersection } from "@lib/hooks/use-in-view"
import { HttpTypes } from "@medusajs/types"
import OptionSelect from "@modules/products/components/product-actions/option-select"
import { isEqual } from "lodash"
import { useParams, usePathname, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import ProductPrice from "../product-price"
import MobileActions from "./mobile-actions"
import { useRouter } from "next/navigation"
import { sdk } from "@lib/config"

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
  existingRestockAlertId?: string | null
}

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) => {
  return variantOptions?.reduce((acc: Record<string, string>, varopt) => {
    if (varopt.option_id) acc[varopt.option_id] = varopt.value
    return acc
  }, {})
}

export default function ProductActions({
  product,
  disabled,
  existingRestockAlertId,
}: ProductActionsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [options, setOptions] = useState<Record<string, string | undefined>>({})
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const countryCode = (useParams().countryCode as string) || "au"

  useEffect(() => {
    if (product.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions(variantOptions ?? {})
    }
  }, [product.variants])

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }
    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  const setOptionValue = (optionId: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [optionId]: value,
    }))
  }

  const isValidVariant = useMemo(() => {
    return product.variants?.some((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  useEffect(() => {
    if (!isValidVariant) return
    const params = new URLSearchParams(searchParams.toString())
    if (params.has("v_id")) {
      params.delete("v_id")
      router.replace(pathname + (params.toString() ? "?" + params.toString() : ""))
    }
  }, [selectedVariant, isValidVariant])

  const inStock = useMemo(() => {
    if (selectedVariant && !selectedVariant.manage_inventory) return true
    if (selectedVariant?.allow_backorder) return true
    if (selectedVariant?.manage_inventory && (selectedVariant?.inventory_quantity || 0) > 0) return true
    return false
  }, [selectedVariant])

  const actionsRef = useRef<HTMLDivElement>(null)
  const inView = useIntersection(actionsRef, "0px")
  const maxQty = selectedVariant?.inventory_quantity || 99

  const allOutOfStock = useMemo(() => {
    return product.variants?.every((v: any) => (v.inventory_quantity ?? 0) === 0)
  }, [product.variants])

  const [restockState, setRestockState] = useState<"idle" | "subscribing" | "subscribed" | "error">(
    existingRestockAlertId ? "subscribed" : "idle"
  )
  const [restockAlertId, setRestockAlertId] = useState<string | null>(existingRestockAlertId || null)

  const metadata = product.metadata as Record<string, any> | null

  const handleSubscribeRestock = async () => {
    setRestockState("subscribing")
    try {
      const res = await sdk.client.fetch<{ restock_alert: { id: string } }>(
        "/store/customers/me/restock-alerts",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: {
            product_id: product.id,
            beer_name: product.title || "",
            brewery_name: metadata?.brewery_name || metadata?.brewery || "",
          },
        }
      )
      const alertId = res?.restock_alert?.id
      if (!alertId) throw new Error("No alert id")
      setRestockAlertId(alertId)
      setRestockState("subscribed")
    } catch {
      setRestockState("error")
    }
  }

  const handleUnsubscribeRestock = async () => {
    if (!restockAlertId) return
    try {
      await sdk.client.fetch(`/store/customers/me/restock-alerts/${restockAlertId}`, {
        method: "DELETE",
      })
      setRestockAlertId(null)
      setRestockState("idle")
    } catch {
      setRestockState("error")
    }
  }

  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return null
    setIsAdding(true)
    setAddError(null)
    try {
      await addToCart({
        variantId: selectedVariant.id,
        quantity,
        countryCode,
      })
    } catch (e: any) {
      setAddError(e?.message || "Failed to add to cart")
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-y-2" ref={actionsRef}>
        {(product.variants?.length ?? 0) > 1 && (
          <div className="flex flex-col gap-y-4 mb-4">
            {(product.options || []).map((option) => (
              <div key={option.id}>
                <OptionSelect
                  option={option}
                  current={options[option.id]}
                  updateOption={setOptionValue}
                  title={option.title ?? ""}
                  data-testid="product-options"
                  disabled={!!disabled || isAdding}
                />
              </div>
            ))}
          </div>
        )}

        <ProductPrice product={product} variant={selectedVariant} />

        <div className="p-6 bg-hg-surface rounded-xl border border-hg-border/30 mt-4">
          {allOutOfStock ? (
            <div className="flex flex-col gap-3">
              {restockState === "subscribed" ? (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-hg-gold">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    You'll be notified on restock
                  </span>
                  <button
                    type="button"
                    onClick={handleUnsubscribeRestock}
                    className="text-xs text-hg-text-secondary hover:text-red-400 underline underline-offset-2"
                  >
                    Unsubscribe
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSubscribeRestock}
                  disabled={restockState === "subscribing"}
                  className="w-full bg-hg-gold text-[#171e00] py-5 rounded-xl font-semibold text-[16px] font-bold hover:opacity-90 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  data-testid="notify-restock-button"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  {restockState === "subscribing" ? "SUBSCRIBING..." : "NOTIFY ME ON RESTOCK"}
                </button>
              )}
              {restockState === "error" && (
                <p className="text-[13px] text-red-400">Failed to subscribe. Please try again.</p>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-stretch gap-3 w-full">
                <div className="flex items-center bg-hg-surface-dim rounded-xl border border-hg-border/30 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="px-3 h-full hover:bg-hg-surface transition-colors flex items-center justify-center text-hg-text-secondary disabled:opacity-30"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                  <span className="w-10 text-center font-semibold text-[16px] text-hg-text select-none">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(maxQty, quantity + 1))}
                    disabled={quantity >= maxQty}
                    className="px-3 h-full hover:bg-hg-surface transition-colors flex items-center justify-center text-hg-text-secondary disabled:opacity-30"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                </div>
                <button
                  onClick={handleAddToCart}
                  disabled={!inStock || !selectedVariant || !!disabled || isAdding || !isValidVariant}
                  className="flex-1 bg-hl-primary text-white py-5 rounded-xl font-semibold text-[16px] font-bold hover:opacity-90 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="add-product-button"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5.52 2c-.614 0-1.148.439-1.26 1.044L3.18 8H1.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h.78l1.17 9.357A2 2 0 0 0 5.435 21h13.13a2 2 0 0 0 1.984-1.643L21.72 10h.78a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-1.68l-1.08-4.956A1.28 1.28 0 0 0 18.48 2H5.52zM12 13a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/>
                  </svg>
                  {!selectedVariant && !options
                    ? "SELECT VARIANT"
                    : !inStock || !isValidVariant
                      ? "OUT OF STOCK"
                      : isAdding
                        ? "ADDING..."
                        : "ADD TO CART"}
                </button>
              </div>
              {addError && (
                <p className="text-[13px] text-red-400 mt-2">{addError}</p>
              )}
            </>
          )}
        </div>
        <MobileActions
          product={product}
          variant={selectedVariant}
          options={options}
          updateOptions={setOptionValue}
          inStock={inStock}
          handleAddToCart={handleAddToCart}
          isAdding={isAdding}
          show={!inView}
          optionsDisabled={!!disabled || isAdding}
        />
      </div>
    </>
  )
}
