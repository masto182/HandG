import { retrieveCustomer } from "@lib/data/customer"
import { Metadata } from "next"
import AccountLayout from "@modules/account/templates/account-layout"
import { redirect } from "next/navigation"
import { updateCustomer } from "@lib/data/customer"

export const metadata: Metadata = {
  title: "Account | Hops & Glory",
}

async function setOnboardingRedirectedFlag(customer: any): Promise<void> {
  try {
    await updateCustomer({
      metadata: {
        ...(customer.metadata ?? {}),
        onboarding_redirected_at: new Date().toISOString(),
      },
    })
  } catch {}
}

export default async function AccountPageLayout({
  dashboard,
  login,
}: {
  dashboard?: React.ReactNode
  login?: React.ReactNode
}) {
  const customer = await retrieveCustomer().catch(() => null)

  // First-login redirect: send newly approved members to the getting-started page.
  if (customer && !(customer.metadata as any)?.onboarding_redirected_at) {
    await setOnboardingRedirectedFlag(customer)
    redirect("/account/getting-started")
  }

  return (
    <AccountLayout customer={customer}>
      {customer ? dashboard : login}
    </AccountLayout>
  )
}
