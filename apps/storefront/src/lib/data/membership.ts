import { sdk } from "@lib/config"
import { getAuthHeaders, removeAuthToken } from "./cookies"
import type { MembershipStatus } from "@lib/util/membership-utils"

export type { MembershipStatus } from "@lib/util/membership-utils"
export { isApprovedMember, isVipMember } from "@lib/util/membership-utils"

export async function getMembershipStatus(): Promise<MembershipStatus> {
  const headers = await getAuthHeaders()

  if (!headers.authorization) {
    return "public"
  }

  try {
    const { status } = await sdk.client.fetch<{ status: string }>(
      "/store/customers/me/membership",
      {
        method: "GET",
        headers,
      }
    )
    return (status as MembershipStatus) || "public"
  } catch (err: any) {
    const httpStatus = err?.response?.status || err?.status
    if (httpStatus === 401) {
      await removeAuthToken()
    }
    return "public"
  }
}
