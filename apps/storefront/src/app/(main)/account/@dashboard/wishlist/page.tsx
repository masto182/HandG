import { getMembershipStatus, isApprovedMember } from "@lib/data/membership"
import { redirect } from "next/navigation"
import WishlistClient from "./wishlist-client"

export default async function WishlistPage() {
  const membershipStatus = await getMembershipStatus()
  if (!isApprovedMember(membershipStatus)) {
    redirect("/account?redirect_to=/account/wishlist")
  }
  return <WishlistClient />
}
