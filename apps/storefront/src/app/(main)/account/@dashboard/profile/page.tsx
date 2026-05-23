import { Metadata } from "next"

import ProfilePhone from "@modules/account//components/profile-phone"
import ProfileBillingAddress from "@modules/account/components/profile-billing-address"
import ProfileEmail from "@modules/account/components/profile-email"
import ProfileName from "@modules/account/components/profile-name"
import AvatarUpload from "@modules/account/components/avatar-upload"
import { notFound } from "next/navigation"
import { listRegions } from "@lib/data/regions"
import { retrieveCustomer } from "@lib/data/customer"
import SignOutButton from "@modules/account/components/sign-out-button"

export const metadata: Metadata = {
  title: "Profile",
  description: "View and edit your Medusa Store profile.",
}

export default async function Profile() {
  const customer = await retrieveCustomer()
  const regions = await listRegions()

  if (!customer || !regions) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="profile-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-2">
        <h1 className="text-h2 text-on-surface">Profile</h1>
        <p className="text-body-md text-on-surface-variant mt-1">
          Manage your account details and membership preferences.
        </p>
      </div>
      <div className="mb-8">
        <AvatarUpload
          currentUrl={(customer.metadata as Record<string, string> | null)?.avatar_url}
          initial={customer.first_name?.charAt(0)?.toUpperCase() || "?"}
        />
      </div>
      <div className="bg-surface-container rounded-xl border border-outline-variant overflow-hidden shadow-sm">
        <div className="flex flex-col divide-y divide-outline-variant">
          <ProfileName customer={customer} />
          <ProfileEmail customer={customer} />
          <ProfilePhone customer={customer} />
          <ProfileBillingAddress customer={customer} regions={regions} />
        </div>
      </div>
      <div className="mt-10 flex justify-end">
        <SignOutButton />
      </div>
    </div>
  )
}
