import { Dialog, Transition } from "@headlessui/react"
import { clx } from "@modules/common/components/ui"
import React, { Fragment, useMemo } from "react"

import useToggleState from "@lib/hooks/use-toggle-state"
import Icon from "@modules/common/components/icon"

import { getProductPrice } from "@lib/util/get-product-price"
import OptionSelect from "./option-select"
import { HttpTypes } from "@medusajs/types"
import { isSimpleProduct } from "@lib/util/product"

type MobileActionsProps = {
  product: HttpTypes.StoreProduct
  variant?: HttpTypes.StoreProductVariant
  options: Record<string, string | undefined>
  updateOptions: (title: string, value: string) => void
  inStock?: boolean
  handleAddToCart: () => void
  isAdding?: boolean
  show: boolean
  optionsDisabled: boolean
}

const MobileActions: React.FC<MobileActionsProps> = ({
  product,
  variant,
  options,
  updateOptions,
  inStock,
  handleAddToCart,
  isAdding,
  show,
  optionsDisabled,
}) => {
  const { state, open, close } = useToggleState()

  const price = getProductPrice({
    product: product,
    variantId: variant?.id,
  })

  const selectedPrice = useMemo(() => {
    if (!price) {
      return null
    }
    const { variantPrice, cheapestPrice } = price

    return variantPrice || cheapestPrice || null
  }, [price])

  const isSimple = isSimpleProduct(product)

  return (
    <>
      <div
        className={clx("lg:hidden inset-x-0 bottom-0 fixed z-50", {
          "pointer-events-none": !show,
        })}
      >
        <Transition
          as={Fragment}
          show={show}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0 translate-y-4"
          enterTo="opacity-100 translate-y-0"
          leave="ease-in duration-300"
          leaveFrom="opacity-100 translate-y-0"
          leaveTo="opacity-0 translate-y-4"
        >
          <div
            className="bg-surface-container border-t border-outline-variant backdrop-blur-xl px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center gap-4"
            data-testid="mobile-actions"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-on-surface truncate" data-testid="mobile-title">
                {product.title}
              </p>
              {selectedPrice && (
                <span className="text-price text-primary font-bold">
                  {selectedPrice.calculated_price}
                </span>
              )}
            </div>

            {!isSimple && !variant && (
              <button
                onClick={open}
                className="px-4 py-2.5 rounded-xl border border-outline-variant text-sm font-medium text-on-surface hover:bg-surface-container-high transition-colors"
                data-testid="mobile-actions-button"
              >
                Options
              </button>
            )}

            <button
              onClick={handleAddToCart}
              disabled={!inStock || !variant || isAdding}
              className="bg-primary text-on-primary font-bold px-5 py-2.5 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2"
              data-testid="mobile-cart-button"
            >
              {isAdding ? (
                <Icon name="progress_activity" size={18} className="animate-spin" />
              ) : !variant ? (
                "Select"
              ) : !inStock ? (
                "Notify me"
              ) : (
                <>
                  <Icon name="add_shopping_cart" size={18} />
                  Add
                </>
              )}
            </button>
          </div>
        </Transition>
      </div>
      <Transition appear show={state} as={Fragment}>
        <Dialog className="relative z-[75]" onClose={close}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed bottom-0 inset-x-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="translate-y-full"
              enterTo="translate-y-0"
              leave="ease-in duration-150"
              leaveFrom="translate-y-0"
              leaveTo="translate-y-full"
            >
              <Dialog.Panel
                className="bg-surface-container-high rounded-t-2xl overflow-hidden"
                data-testid="mobile-actions-modal"
              >
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 rounded-full bg-outline-variant" />
                </div>
                <div className="px-6 py-6 flex flex-col gap-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-h3 text-on-surface">Select Options</h3>
                    <button
                      onClick={close}
                      className="text-on-surface-variant hover:text-on-surface transition-colors"
                      data-testid="close-modal-button"
                    >
                      <Icon name="close" size={24} />
                    </button>
                  </div>
                  {(product.options || []).map((option) => (
                    <OptionSelect
                      key={option.id}
                      option={option}
                      current={options[option.id]}
                      updateOption={updateOptions}
                      title={option.title ?? ""}
                      disabled={optionsDisabled}
                    />
                  ))}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}

export default MobileActions
