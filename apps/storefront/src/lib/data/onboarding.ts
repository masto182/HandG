"use server"
import { cookies as nextCookies } from "next/headers"
import { redirect } from "next/navigation"
import { sdk } from "@lib/config"
import { getAuthHeaders } from "./cookies"
import type { OnboardingProgress } from "@lib/hooks/use-onboarding-progress"

export async function resetOnboardingState(orderId: string) {
  const cookies = await nextCookies()
  cookies.set("_medusa_onboarding", "false", { maxAge: -1 })
  redirect(`http://localhost:7001/a/orders/${orderId}`)
}

export async function getOnboardingProgress(): Promise<OnboardingProgress | null> {
  try {
    const headers = await getAuthHeaders()
    if (!headers.authorization) return null
    return await sdk.client.fetch<OnboardingProgress>(
      "/store/customers/me/onboarding",
      { method: "GET", headers, next: { revalidate: 0 } },
    )
  } catch {
    return null
  }
}
