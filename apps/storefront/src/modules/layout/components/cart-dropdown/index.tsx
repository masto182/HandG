"use client"

import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from "@headlessui/react"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@modules/common/components/ui"
import DeleteButton from "@modules/common/components/delete-button"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "@modules/products/components/thumbnail"
import { usePathname } from "next/navigation"
import { Fragment, useEffect, useRef, useState } from "react"

const CartDropdown = ({
  cart: cartState,
}: {
  cart?: HttpTypes.StoreCart | null
}) => {
  const [activeTimer, setActiveTimer] = useState<NodeJS.Timer | undefined>(
    undefined
  )
  const [cartDropdownOpen, setCartDropdownOpen] = useState(false)

  const open = () => setCartDropdownOpen(true)
  const close = () => setCartDropdownOpen(false)

  const totalItems =
    cartState?.items?.reduce((acc, item) => {
      return acc + item.quantity
    }, 0) || 0

  const subtotal = cartState?.total ?? 0
  const itemRef = useRef<number>(totalItems || 0)

  const timedOpen = () => {
    open()

    const timer = setTimeout(close, 5000)

    setActiveTimer(timer)
  }

  const openAndCancel = () => {
    if (activeTimer) {
      clearTimeout(activeTimer)
    }

    open()
  }

  // Clean up the timer when the component unmounts
  useEffect(() => {
    return () => {
      if (activeTimer) {
        clearTimeout(activeTimer)
      }
    }
  }, [activeTimer])

  const pathname = usePathname()

  // open cart dropdown when modifying the cart items, but only if we're not on the cart page
  useEffect(() => {
    if (itemRef.current !== totalItems && !pathname.includes("/cart")) {
      timedOpen()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalItems, itemRef.current])

  return (
    <div
      className="h-full z-50"
      onMouseEnter={openAndCancel}
      onMouseLeave={close}
    >
      <Popover className="relative h-full">
        <PopoverButton className="h-full">
          <LocalizedClientLink
            className="hover:text-hg-text"
            href="/cart"
            data-testid="nav-cart-link"
          >{`Cart (${totalItems})`}</LocalizedClientLink>
        </PopoverButton>
        <Transition
          show={cartDropdownOpen}
          as={Fragment}
          enter="transition ease-out duration-200"
          enterFrom="opacity-0 translate-y-1"
          enterTo="opacity-100 translate-y-0"
          leave="transition ease-in duration-150"
          leaveFrom="opacity-100 translate-y-0"
          leaveTo="opacity-0 translate-y-1"
        >
          <PopoverPanel
            static
            className="hidden small:block absolute top-[calc(100%+1px)] right-0 bg-hg-bg border border-hg-border rounded-xl shadow-xl w-[380px] text-hg-text overflow-hidden"
            data-testid="nav-cart-dropdown"
          >
            <div className="px-5 py-4 border-b border-hg-border/50">
              <h3 className="text-sm font-semibold text-hg-text">Cart</h3>
            </div>
            {cartState && cartState.items?.length ? (
              <>
                <div className="overflow-y-auto max-h-[320px] px-5 py-5 flex flex-col gap-5 no-scrollbar">
                  {cartState.items
                    .sort((a, b) => {
                      return (a.created_at ?? "") > (b.created_at ?? "")
                        ? -1
                        : 1
                    })
                    .map((item) => (
                      <div
                        className="flex gap-3"
                        key={item.id}
                        data-testid="cart-item"
                      >
                        <LocalizedClientLink
                          href={`/products/${item.product_handle}`}
                          className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden border border-hg-border/50"
                        >
                          <Thumbnail
                            thumbnail={item.thumbnail}
                            images={item.variant?.product?.images}
                            size="square"
                          />
                        </LocalizedClientLink>
                        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-medium text-hg-text truncate">
                              <LocalizedClientLink
                                href={`/products/${item.product_handle}`}
                                data-testid="product-link"
                              >
                                {item.title}
                              </LocalizedClientLink>
                            </h3>
                            <span className="text-sm font-semibold text-hg-gold flex-shrink-0">
                              <LineItemPrice
                                item={item}
                                style="tight"
                                currencyCode={cartState.currency_code}
                              />
                            </span>
                          </div>
                          <span className="text-xs text-hg-text-secondary">
                            Qty: {item.quantity}
                          </span>
                          <DeleteButton
                            id={item.id}
                            className="text-xs text-hg-text-secondary/60 hover:text-red-400 transition-colors w-fit"
                            data-testid="cart-item-remove-button"
                          >
                            Remove
                          </DeleteButton>
                        </div>
                      </div>
                    ))}
                </div>
                <div className="px-5 py-5 flex flex-col gap-4 border-t border-hg-border/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-hg-text-secondary">Total</span>
                    <span
                      className="text-sm font-bold text-hg-text"
                      data-testid="cart-subtotal"
                      data-value={subtotal}
                    >
                      {convertToLocale({
                        amount: subtotal,
                        currency_code: cartState.currency_code,
                      })}
                    </span>
                  </div>
                  <LocalizedClientLink href="/cart" passHref>
                    <Button
                      className="w-full h-9 text-sm"
                      size="large"
                      data-testid="go-to-cart-button"
                    >
                      Go to cart
                    </Button>
                  </LocalizedClientLink>
                </div>
              </>
            ) : (
              <div className="px-5 py-12 flex flex-col gap-3 items-center justify-center">
                <div className="bg-hg-surface border border-hg-border text-xs flex items-center justify-center w-8 h-8 rounded-full text-hg-text-secondary font-semibold">
                  0
                </div>
                <span className="text-sm text-hg-text-secondary">Your cart is empty</span>
                <LocalizedClientLink href="/store">
                  <Button onClick={close} className="text-sm h-9">Explore products</Button>
                </LocalizedClientLink>
              </div>
            )}
          </PopoverPanel>
        </Transition>
      </Popover>
    </div>
  )
}

export default CartDropdown
