import { getMembershipStatus, isApprovedMember } from "@lib/data/membership"
import { redirect } from "next/navigation"
import ReferralsClient from "./referrals-client"

export default async function ReferralsPage() {
  const membershipStatus = await getMembershipStatus()
  if (!isApprovedMember(membershipStatus)) {
    redirect("/account?redirect_to=/account/referrals")
  }
  return <ReferralsClient />
}
