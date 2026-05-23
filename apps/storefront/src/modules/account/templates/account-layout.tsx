import React from "react"

import AccountNav from "../components/account-nav"
import { HttpTypes } from "@medusajs/types"

interface AccountLayoutProps {
  customer: HttpTypes.StoreCustomer | null
  children: React.ReactNode
}

const AccountLayout: React.FC<AccountLayoutProps> = ({
  customer,
  children,
}) => {
  return (
    <div className="flex-1" data-testid="account-page">
      {customer ? (
        <>
          <div className="small:hidden px-4 py-4">
            <AccountNav customer={customer} mobile />
          </div>
          <div className="flex min-h-[calc(100vh-64px)]">
            <aside className="hidden small:flex w-[200px] flex-col bg-surface-container border-r border-outline-variant/50 sticky top-16 h-[calc(100vh-64px)] overflow-y-auto">
              <div className="p-4 flex flex-col h-full">
                <AccountNav customer={customer} />
              </div>
            </aside>
            <main className="flex-1 min-w-0 px-10 py-8 max-w-5xl mx-auto">{children}</main>
          </div>
        </>
      ) : (
        <div className="content-container max-w-6xl mx-auto py-12">{children}</div>
      )}
    </div>
  )
}

export default AccountLayout
