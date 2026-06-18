import { getMembershipStatus, isApprovedMember } from "@lib/data/membership"
import { getReferralData } from "@lib/data/referrals"
import { redirect } from "next/navigation"
import ReferralsClient from "./referrals-client"

export default async function ReferralsPage() {
  const membershipStatus = await getMembershipStatus()
  if (!isApprovedMember(membershipStatus)) {
    redirect("/account?redirect_to=/account/referrals")
  }
  // Fetch server-side during the GET render (cookie is available here) and pass
  // it down. The client-side server-action fetch otherwise fails in production
  // where the Secure auth cookie isn't sent on the POST over http.
  const initialData = await getReferralData()
  return <ReferralsClient initialData={initialData} />
}
