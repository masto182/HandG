import ItemsTemplate from "./items"
import Summary from "./summary"
import EmptyCartMessage from "../components/empty-cart-message"
import SignInPrompt from "../components/sign-in-prompt"
import Divider from "@modules/common/components/divider"
import TrackPageView from "@modules/common/components/track-page-view"
import ThemeToggle from "@modules/layout/components/theme-toggle"
import { HttpTypes } from "@medusajs/types"
import type { VariantAvailabilityMap } from "@lib/util/stock"

const CartTemplate = ({
  cart,
  customer,
  availability = null,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
  availability?: VariantAvailabilityMap | null
}) => {
  return (
    <div>
      {cart?.id ? (
        <TrackPageView
          event="cart.viewed"
          payload={{ cart_id: cart.id, item_count: cart.items?.length ?? 0 }}
        />
      ) : null}
      <div
        className="border-b border-hg-border shadow-sm backdrop-blur-xl"
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--color-bg) 92%, transparent)",
        }}
      >
        <div className="flex justify-between items-center h-16 px-6 max-w-[1440px] mx-auto">
          <h1 className="text-xl font-black tracking-tighter text-hg-text">
            Your Cart
          </h1>
          <ThemeToggle />
        </div>
      </div>
      <div className="py-6 lg:py-12">
        <div className="content-container" data-testid="cart-container">
          {cart?.items?.length ? (
            <div className="flex flex-col lg:flex-row gap-10">
              <div className="flex-1">
                <div className="space-y-6" id="cart-items">
                  {!customer && (
                    <>
                      <SignInPrompt />
                      <Divider />
                    </>
                  )}
                  <ItemsTemplate cart={cart} availability={availability} />
                </div>
              </div>
              <aside className="w-full lg:w-[360px]">
                <div className="lg:sticky lg:top-8">
                  {cart && cart.region && (
                    <div className="bg-surface-container rounded-2xl border border-outline-variant p-5 lg:p-8 shadow-lg">
                      <Summary cart={cart} availability={availability} />
                    </div>
                  )}
                </div>
              </aside>
            </div>
          ) : (
            <div>
              <EmptyCartMessage />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CartTemplate
