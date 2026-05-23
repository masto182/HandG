import ItemsTemplate from "./items"
import Summary from "./summary"
import EmptyCartMessage from "../components/empty-cart-message"
import SignInPrompt from "../components/sign-in-prompt"
import Divider from "@modules/common/components/divider"
import ThemeToggle from "@modules/layout/components/theme-toggle"
import { HttpTypes } from "@medusajs/types"

const CartTemplate = ({
  cart,
  customer,
  inventoryMap = {},
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
  inventoryMap?: Record<string, number>
}) => {
  return (
    <div>
      <div className="border-b border-hg-border shadow-sm backdrop-blur-xl" style={{ backgroundColor: "color-mix(in srgb, var(--color-bg) 92%, transparent)" }}>
        <div className="flex justify-between items-center h-16 px-6 max-w-[1440px] mx-auto">
          <h1 className="text-xl font-black tracking-tighter text-hg-text">Your Cart</h1>
          <ThemeToggle />
        </div>
      </div>
      <div className="py-12">
        <div className="content-container" data-testid="cart-container">
          {cart?.items?.length ? (
            <div className="flex flex-col lg:flex-row gap-10">
              <div className="flex-1">
                <div className="space-y-6">
                  {!customer && (
                    <>
                      <SignInPrompt />
                      <Divider />
                    </>
                  )}
                  <ItemsTemplate cart={cart} inventoryMap={inventoryMap} />
                </div>
              </div>
              <aside className="w-full lg:w-[360px]">
                <div className="sticky top-28">
                  {cart && cart.region && (
                    <div className="bg-surface-container rounded-2xl border border-outline-variant p-8 shadow-lg">
                      <Summary cart={cart} />
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
