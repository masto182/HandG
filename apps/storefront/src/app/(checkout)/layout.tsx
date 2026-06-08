import { retrieveCustomer } from "@lib/data/customer"
import { getMembershipStatus } from "@lib/data/membership"
import Nav from "@modules/layout/templates/nav"

export default async function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const membershipStatus = await getMembershipStatus()
  const customer = await retrieveCustomer()

  return (
    <div className="w-full bg-hg-bg relative min-h-screen">
      <Nav membershipStatus={membershipStatus} customer={customer} />
      <div className="relative" data-testid="checkout-container">
        {children}
      </div>
    </div>
  )
}
