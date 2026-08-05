"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { revalidateTag as _revalidateTag } from "next/cache"
// Next.js 16 made the profile arg required in types but the single-arg form
// still works at runtime and invalidates ALL cache entries for the tag
// (profile-filtered form introduced by "default" breaks cache invalidation).
const revalidateTag = _revalidateTag as (tag: string) => void
import { redirect } from "next/navigation"
import {
  getAuthHeaders,
  getCacheOptions,
  getCacheTag,
  getCartId,
  removeAuthToken,
  removeCartId,
  setAuthToken,
} from "./cookies"

export const retrieveCustomer =
  async (): Promise<HttpTypes.StoreCustomer | null> => {
    const authHeaders = await getAuthHeaders()

    if (!authHeaders || !("authorization" in authHeaders)) return null

    const headers = {
      ...authHeaders,
    }

    const next = {
      ...(await getCacheOptions("customers")),
    }

    return await sdk.client
      .fetch<{ customer: HttpTypes.StoreCustomer }>(`/store/customers/me`, {
        method: "GET",
        query: {
          fields: "*orders,+addresses",
        },
        headers,
        next,
      })
      .then(({ customer }) => customer)
      .catch(async (err) => {
        const status = err?.response?.status || err?.status
        if (status === 401) {
          await removeAuthToken()
        }
        return null
      })
  }

export const updateCustomer = async (body: HttpTypes.StoreUpdateCustomer) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const updateRes = await sdk.store.customer
    .update(body, {}, headers)
    .then(({ customer }) => customer)
    .catch(medusaError)

  const cacheTag = await getCacheTag("customers")
  revalidateTag(cacheTag)

  return updateRes
}

export async function signup(_currentState: unknown, _formData: FormData) {
  // Self-service signup is disabled on this members-only site.
  // Users apply via /apply (see apps/storefront/src/modules/apply) and are
  // approved by an admin before they can log in.
  return "Registration is by application only. Please visit /apply."
}

export async function login(_currentState: unknown, formData: FormData) {
  const email = (formData.get("email") as string).trim().toLowerCase()
  const password = formData.get("password") as string

  try {
    await sdk.auth
      .login("customer", "emailpass", { email, password })
      .then(async (token) => {
        await setAuthToken(token as string)
        const customerCacheTag = await getCacheTag("customers")
        revalidateTag(customerCacheTag)
      })
  } catch (error) {
    return String(error)
  }

  try {
    await transferCart()
  } catch (error) {
    return String(error)
  }
}

export async function requestPasswordReset(
  _: unknown,
  formData: FormData,
): Promise<string | null> {
  const email = ((formData.get("email") as string) || "").trim().toLowerCase()
  if (!email) return "Email is required"

  try {
    await sdk.client.fetch("/store/customers/forgot-password", {
      method: "POST",
      body: { email },
    })
  } catch {
    // swallow — the backend always returns 200; network errors are silent
  }

  return "sent"
}

export async function resetPassword(
  _: unknown,
  formData: FormData,
): Promise<string | null> {
  const email = formData.get("email") as string
  const token = formData.get("token") as string
  const password = formData.get("password") as string
  const confirmPassword = formData.get("confirm_password") as string

  if (password !== confirmPassword) return "Passwords do not match"
  if (password.length < 12) return "Password must be at least 12 characters"

  try {
    await sdk.client.fetch("/store/customers/reset-password", {
      method: "POST",
      body: { email, token, new_password: password },
    })
  } catch (e: any) {
    const msg =
      e?.response?.json?.error ||
      e?.message ||
      "Reset failed — the link may have expired"
    return String(msg)
  }

  redirect("/account")
}

export async function signout(_countryCode?: string) {
  try {
    await sdk.auth.logout()
  } catch {}

  await removeAuthToken()

  const customerCacheTag = await getCacheTag("customers")
  revalidateTag(customerCacheTag)

  await removeCartId()

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag)

  redirect("/")
}

export async function transferCart() {
  const cartId = await getCartId()

  if (!cartId) {
    return
  }

  const headers = await getAuthHeaders()

  await sdk.store.cart.transferCart(cartId, {}, headers)

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag)
}

export const listCustomerAddresses = async (): Promise<
  HttpTypes.StoreCustomerAddress[]
> => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.customer
    .listAddress({}, headers)
    .then(({ addresses }) => addresses)
    .catch(() => [])
}

export const addCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData,
): Promise<{ success: boolean; error: string | null }> => {
  const isDefaultBilling = (currentState.isDefaultBilling as boolean) || false
  const isDefaultShipping = (currentState.isDefaultShipping as boolean) || false

  const address = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    company: formData.get("company") as string,
    address_1: formData.get("address_1") as string,
    address_2: formData.get("address_2") as string,
    city: formData.get("city") as string,
    postal_code: formData.get("postal_code") as string,
    province: formData.get("province") as string,
    country_code: formData.get("country_code") as string,
    phone: formData.get("phone") as string,
    is_default_billing: isDefaultBilling,
    is_default_shipping: isDefaultShipping,
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.customer
    .createAddress(address, {}, headers)
    .then(async () => {
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag)
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

export const deleteCustomerAddress = async (
  addressId: string,
): Promise<void> => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.customer
    .deleteAddress(addressId, headers)
    .then(async () => {
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag)
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

export const updateCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData,
): Promise<{ success: boolean; error: string | null }> => {
  const addressId =
    (currentState.addressId as string) || (formData.get("addressId") as string)

  if (!addressId) {
    return { success: false, error: "Address ID is required" }
  }

  const address = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    company: formData.get("company") as string,
    address_1: formData.get("address_1") as string,
    address_2: formData.get("address_2") as string,
    city: formData.get("city") as string,
    postal_code: formData.get("postal_code") as string,
    province: formData.get("province") as string,
    country_code: formData.get("country_code") as string,
  } as HttpTypes.StoreUpdateCustomerAddress

  const phone = formData.get("phone") as string

  if (phone) {
    address.phone = phone
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.customer
    .updateAddress(addressId, address, {}, headers)
    .then(async () => {
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag)
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}
