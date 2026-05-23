import { retrieveCustomer } from "@lib/data/customer"
import { Metadata } from "next"
import AccountLayout from "@modules/account/templates/account-layout"

export const metadata: Metadata = {
  title: "Account | Hops & Glory",
}

export default async function AccountPageLayout({
  dashboard,
  login,
}: {
  dashboard?: React.ReactNode
  login?: React.ReactNode
}) {
  const customer = await retrieveCustomer().catch(() => null)

  return (
    <AccountLayout customer={customer}>
      {customer ? dashboard : login}
    </AccountLayout>
  )
}
