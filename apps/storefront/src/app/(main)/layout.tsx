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
    <div className="pb-14 small:pb-0">
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
      {children}
      <Footer isApproved={isApproved} />
      <MobileBottomNav isApproved={isApproved} isLoggedIn={isLoggedIn} />
    </div>
  )
}
