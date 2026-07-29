import { Metadata } from "next"
import { redirect } from "next/navigation"
import { retrieveCustomer } from "@lib/data/customer"
import { getOnboardingProgress } from "@lib/data/onboarding"
import GettingStartedClient from "@modules/account/components/getting-started"

export const metadata: Metadata = {
  title: "Getting Started",
  description: "Complete your setup and earn VIP points.",
}

export default async function GettingStartedPage() {
  const [customer, progress] = await Promise.all([
    retrieveCustomer().catch(() => null),
    getOnboardingProgress(),
  ])

  if (!customer) {
    redirect("/account/login")
  }

  if (!progress) {
    redirect("/account")
  }

  return (
    <GettingStartedClient
      initialProgress={progress}
      customerName={customer.first_name ?? ""}
    />
  )
}
