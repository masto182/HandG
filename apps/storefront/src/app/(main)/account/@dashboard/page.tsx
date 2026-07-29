import { Metadata } from "next"

import Overview from "@modules/account/components/overview"
import { notFound } from "next/navigation"
import { retrieveCustomer } from "@lib/data/customer"
import { listOrders } from "@lib/data/orders"
import { getOnboardingProgress } from "@lib/data/onboarding"

export const metadata: Metadata = {
  title: "Account",
  description: "Overview of your account activity.",
}

export default async function OverviewTemplate() {
  const [customer, orders, onboardingProgress] = await Promise.all([
    retrieveCustomer().catch(() => null),
    listOrders().catch(() => null),
    getOnboardingProgress(),
  ])

  if (!customer) {
    notFound()
  }

  return (
    <Overview
      customer={customer}
      orders={orders ?? null}
      initialOnboardingProgress={onboardingProgress}
    />
  )
}
