import { listCartOptions, retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { getMembershipStatus, isApprovedMember } from "@lib/data/membership"
import { StoreCartShippingOption } from "@medusajs/types"
import CartMismatchBanner from "@modules/layout/components/cart-mismatch-banner"
import PendingBanner from "@modules/layout/components/pending-banner"
import MobileBottomNav from "@modules/layout/components/mobile-bottom-nav"
import Footer from "@modules/layout/templates/footer"
import Nav from "@modules/layout/templates/nav"
import FreeShippingPriceNudge from "@modules/shipping/components/free-shipping-price-nudge"

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const membershipStatus = await getMembershipStatus()
  const isApproved = isApprovedMember(membershipStatus)
  const isLoggedIn = membershipStatus !== "public"

  const customer = await retrieveCustomer()
  const cart = isApproved ? await retrieveCart() : null
  let shippingOptions: StoreCartShippingOption[] = []

  if (cart) {
    try {
      const { shipping_options } = await listCartOptions()
      shippingOptions = shipping_options
    } catch {}
  }

  return (
    <div className="pb-[calc(3.5rem+env(safe-area-inset-bottom))] small:pb-0">
      {/* Skip navigation — WCAG 2.4.1 Level A */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:bg-hg-gold focus:text-hg-bg focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-semibold focus:shadow-lg"
      >
        Skip to main content
      </a>
      <Nav membershipStatus={membershipStatus} customer={customer} />
      {membershipStatus === "pending" && <PendingBanner />}
      {isApproved && customer && cart && (
        <CartMismatchBanner customer={customer} cart={cart} />
      )}
      {isApproved && cart && (
        <FreeShippingPriceNudge
          variant="popup"
          cart={cart}
          shippingOptions={shippingOptions}
        />
      )}
      <main id="main-content">{children}</main>
      <Footer isApproved={isApproved} />
      <MobileBottomNav isApproved={isApproved} isLoggedIn={isLoggedIn} />
    </div>
  )
}
