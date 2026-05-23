import { Metadata } from "next"

import AddressBook from "@modules/account/components/address-book"

import { getRegion, listRegions } from "@lib/data/regions"
import { retrieveCustomer } from "@lib/data/customer"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Addresses",
  description: "View your addresses",
}

export const dynamic = "force-dynamic"

export default async function Addresses() {
  let customer: any = null
  try {
    customer = await retrieveCustomer()
  } catch {}

  if (!customer) {
    redirect("/account")
  }

  let region: any = null
  try {
    region = await getRegion("au")
    if (!region) {
      const regions = await listRegions()
      region = regions?.[0] ?? null
    }
  } catch {}

  return (
    <div className="w-full" data-testid="addresses-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-2">
        <h1 className="text-h2 text-on-surface">Shipping Addresses</h1>
        <p className="text-body-md text-on-surface-variant mt-1">
          View and update your shipping addresses, you can add as many as you
          like. Saving your addresses will make them available during checkout.
        </p>
      </div>
      {region ? (
        <AddressBook customer={customer} region={region} />
      ) : (
        <p className="text-sm text-hg-text-secondary">Unable to load regions. Please refresh.</p>
      )}
    </div>
  )
}
