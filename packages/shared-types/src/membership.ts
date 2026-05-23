export type MembershipStatus =
  | "public"
  | "pending"
  | "approved"
  | "vip1"
  | "vip2"
  | "vip3"
  | "vip4"
  | "vip5"
  | "rejected"
  | "suspended"

export const APPROVED_STATUSES: MembershipStatus[] = [
  "approved",
  "vip1",
  "vip2",
  "vip3",
  "vip4",
  "vip5",
]

export function isApprovedMember(status: MembershipStatus): boolean {
  return APPROVED_STATUSES.includes(status)
}

export function isVipMember(status: MembershipStatus): boolean {
  return status.startsWith("vip")
}
