"use server"

import { sdk } from "@lib/config"
import medusaError, { isStaleCartError } from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import {
  getAuthHeaders,
  getCacheOptions,
  getCacheTag,
  getCartId,
  removeCartId,
  setCartId,
} from "./cookies"
import { getRegion } from "./regions"
import { getLocale } from "./locale-actions"

/**
 * Detects when an error came from Medusa's get-variants/region validation
 * (cart references deleted region or variants) and recovers by removing the
 * stale cart cookie. Forwards anything else through medusaError.
 *
 * If `retryOp` is provided, the operation is retried once after the cookie
 * is cleared so callers like addToCart can complete the user's intent
 * against a fresh cart.
 */
async function withStaleCartRecovery<T>(
  op: () => Promise<T>,
  retryOp?: () => Promise<T>
): Promise<T> {
  try {
    return await op()
  } catch (err) {
    if (isStaleCartError(err)) {
      await removeCartId()
      try {
        const cartCacheTag = await getCacheTag("carts")
        revalidateTag(cartCacheTag)
      } catch {
        // revalidateTag is only valid in Server Actions / Route Handlers.
        // From a render context Next throws \u2014 swallow; cache will refresh
        // naturally on the next mutation.
      }
      if (retryOp) {
        return await retryOp()
      }
      // No retry path: surface a friendly message so the UI can re-render
      // with a clean cart on next request.
      throw new Error(
        "Your cart was reset because it referenced items that are no longer available. Please try again."
      )
    }
    return medusaError(err)
  }
}

/**
 * Retrieves a cart by its ID. If no ID is provided, it will use the cart ID from the cookies.
 * @param cartId - optional - The ID of the cart to retrieve.
 * @returns The cart object if found, or null if not found.
 */
export async function retrieveCart(cartId?: string, fields?: string) {
  const id = cartId || (await getCartId())
  fields ??=
    "*items, *region, *items.product, +items.product.metadata, *items.variant, *items.variant.options, *items.variant.options.option, *items.variant.product, +items.variant.product.metadata, +items.variant.inventory_quantity, *items.thumbnail, *items.metadata, +items.total, +items.product_subtitle, +items.product_collection, *promotions, +shipping_methods.name, +shipping_methods.data"

  if (!id) {
    return null
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("carts")),
  }

  return await sdk.client
    .fetch<HttpTypes.StoreCartResponse>(`/store/carts/${id}`, {
      method: "GET",
      query: {
        fields,
      },
      headers,
      next,
      cache: "force-cache",
    })
    .then(async ({ cart }: { cart: HttpTypes.StoreCart }) => {
      // Stale cart sentinel: if the cart's region was deleted (e.g. EU cleanup
      // ran while this user had a session), Medusa still returns the row but
      // with no region object. Treat it as stale, clear the cookie, and let
      // the caller create a fresh cart on the next request.
      if (!cart?.region_id || !(cart as any).region) {
        await removeCartId()
        try {
          const cartCacheTag = await getCacheTag("carts")
          revalidateTag(cartCacheTag)
        } catch {
          // revalidateTag is only allowed in Server Actions / Route Handlers.
          // When called during a Server Component render, Next throws — swallow
          // it; cache will refresh naturally on the next mutation.
        }
        return null
      }
      return cart
    })
    .catch(async (err) => {
      if (isStaleCartError(err)) {
        await removeCartId()
        try {
          const cartCacheTag = await getCacheTag("carts")
          revalidateTag(cartCacheTag)
        } catch {
          // see comment above
        }
      }
      return null
    })
}

export async function getOrSetCart(countryCode: string) {
  const region = await getRegion(countryCode)

  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`)
  }

  let cart = await retrieveCart()

  const headers = {
    ...(await getAuthHeaders()),
  }

  const createFreshCart = async () => {
    const locale = await getLocale()
    const cartResp = await sdk.store.cart.create(
      { region_id: region.id, locale: locale || undefined },
      {},
      headers
    )
    await setCartId(cartResp.cart.id)
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
    return cartResp.cart
  }

  if (!cart) {
    cart = await createFreshCart()
  }

  if (cart && cart?.region_id !== region.id) {
    cart = await withStaleCartRecovery(
      async () => {
        const { cart: updated } = await sdk.store.cart.update(
          cart!.id,
          { region_id: region.id },
          {},
          headers
        )
        const cartCacheTag = await getCacheTag("carts")
        revalidateTag(cartCacheTag)
        return updated
      },
      // Retry path: the existing cart was unrecoverable (stale variants from
      // a region wipe). Create a fresh one in the right region.
      createFreshCart
    )
  }

  return cart
}

export async function updateCart(data: HttpTypes.StoreUpdateCart) {
  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("No existing cart found, please create one before updating")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return withStaleCartRecovery(async () => {
    const { cart } = await sdk.store.cart.update(cartId, data, {}, headers)
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
    const fulfillmentCacheTag = await getCacheTag("fulfillment")
    revalidateTag(fulfillmentCacheTag)
    return cart
  })
}

export async function addToCart({
  variantId,
  quantity,
  countryCode,
}: {
  variantId: string
  quantity: number
  countryCode: string
}) {
  if (!variantId) {
    throw new Error("Missing variant ID when adding to cart")
  }

  const cart = await getOrSetCart(countryCode)

  if (!cart) {
    throw new Error("Error retrieving or creating cart")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  await withStaleCartRecovery(
    async () => {
      await sdk.store.cart.createLineItem(
        cart!.id,
        { variant_id: variantId, quantity },
        {},
        headers
      )
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)
      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)
    },
    // Retry path: existing cart had stale items from a region/variant wipe.
    // The recovery wrapper has already cleared the cookie; we mint a fresh
    // cart and re-add the item so the user's intent still completes.
    async () => {
      const fresh = await getOrSetCart(countryCode)
      if (!fresh) {
        throw new Error("Could not create a fresh cart")
      }
      const retryHeaders = { ...(await getAuthHeaders()) }
      await sdk.store.cart.createLineItem(
        fresh.id,
        { variant_id: variantId, quantity },
        {},
        retryHeaders
      )
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)
      const fulfillmentCacheTag = await getCacheTag("fulfillment")
      revalidateTag(fulfillmentCacheTag)
    }
  )
}

export async function updateLineItem({
  lineId,
  quantity,
}: {
  lineId: string
  quantity: number
}) {
  if (!lineId) {
    throw new Error("Missing lineItem ID when updating line item")
  }

  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("Missing cart ID when updating line item")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  await withStaleCartRecovery(async () => {
    await sdk.store.cart.updateLineItem(cartId, lineId, { quantity }, {}, headers)
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
    const fulfillmentCacheTag = await getCacheTag("fulfillment")
    revalidateTag(fulfillmentCacheTag)
  })
}

export async function deleteLineItem(lineId: string) {
  if (!lineId) {
    throw new Error("Missing lineItem ID when deleting line item")
  }

  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("Missing cart ID when deleting line item")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  await withStaleCartRecovery(async () => {
    await sdk.store.cart.deleteLineItem(cartId, lineId, {}, headers)
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
    const fulfillmentCacheTag = await getCacheTag("fulfillment")
    revalidateTag(fulfillmentCacheTag)
  })
}

export async function setShippingMethod({
  cartId,
  shippingMethodId,
  data,
}: {
  cartId: string
  shippingMethodId: string
  data?: Record<string, unknown>
}) {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return withStaleCartRecovery(async () => {
    const result = await sdk.store.cart.addShippingMethod(
      cartId,
      { option_id: shippingMethodId, data },
      {},
      headers
    )
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
    return result
  })
}

export async function initiatePaymentSession(
  cart: HttpTypes.StoreCart,
  data: HttpTypes.StoreInitializePaymentSession
) {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.payment
    .initiatePaymentSession(cart, data, {}, headers)
    .then(async (resp) => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)
      return resp
    })
    .catch(medusaError)
}

export async function applyPromotions(codes: string[]) {
  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("No existing cart found")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return withStaleCartRecovery(async () => {
    await sdk.store.cart.update(cartId, { promo_codes: codes }, {}, headers)
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
    const fulfillmentCacheTag = await getCacheTag("fulfillment")
    revalidateTag(fulfillmentCacheTag)
  })
}

export async function submitPromotionForm(
  currentState: unknown,
  formData: FormData
) {
  const code = formData.get("code") as string
  try {
    await applyPromotions([code])
  } catch (e: any) {
    return e.message
  }
}

export type SetAddressesAddress = {
  first_name: string
  last_name: string
  address_1: string
  address_2?: string
  company?: string
  postal_code: string
  city: string
  country_code: string
  province?: string
  phone?: string
}

export type SetAddressesInput = {
  shipping_address: SetAddressesAddress
  billing_address?: SetAddressesAddress
  email: string
  same_as_billing?: boolean
}

export async function setAddresses(currentState: unknown, input: SetAddressesInput) {
  try {
    const cartId = await getCartId()
    if (!cartId) {
      throw new Error("No existing cart found when setting addresses")
    }

    const data: Record<string, unknown> = {
      shipping_address: input.shipping_address,
      email: input.email,
    }

    if (input.same_as_billing) {
      data.billing_address = input.shipping_address
    } else if (input.billing_address) {
      data.billing_address = input.billing_address
    }

    await updateCart(data)
  } catch (e: any) {
    return e.message
  }

  redirect(`/checkout?step=shipping`)
}

/**
 * Places an order for a cart. If no cart ID is provided, it will use the cart ID from the cookies.
 * @param cartId - optional - The ID of the cart to place an order for.
 * @returns The cart object if the order was successful, or null if not.
 */
export async function placeOrder(cartId?: string) {
  const id = cartId || (await getCartId())

  if (!id) {
    throw new Error("No existing cart found when placing an order")
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const cartRes = await sdk.store.cart
    .complete(id, {}, headers)
    .then(async (cartRes) => {
      const cartCacheTag = await getCacheTag("carts")
      revalidateTag(cartCacheTag)
      return cartRes
    })
    .catch(medusaError)

  if (cartRes?.type === "order") {
    const countryCode =
      cartRes.order.shipping_address?.country_code?.toLowerCase()

    const orderCacheTag = await getCacheTag("orders")
    revalidateTag(orderCacheTag)

    removeCartId()
    redirect(`/order/${cartRes?.order.id}/confirmed`)
  }

  return cartRes.cart
}

/**
 * Updates the countrycode param and revalidates the regions cache
 * @param regionId
 * @param countryCode
 */
export async function updateRegion(countryCode: string, currentPath: string) {
  const cartId = await getCartId()
  const region = await getRegion(countryCode)

  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`)
  }

  if (cartId) {
    await updateCart({ region_id: region.id })
    const cartCacheTag = await getCacheTag("carts")
    revalidateTag(cartCacheTag)
  }

  const regionCacheTag = await getCacheTag("regions")
  revalidateTag(regionCacheTag)

  const productsCacheTag = await getCacheTag("products")
  revalidateTag(productsCacheTag)

  redirect(currentPath)
}

export async function listCartOptions() {
  const cartId = await getCartId()
  const headers = {
    ...(await getAuthHeaders()),
  }
  const next = {
    ...(await getCacheOptions("shippingOptions")),
  }

  return await sdk.client.fetch<{
    shipping_options: HttpTypes.StoreCartShippingOption[]
  }>("/store/shipping-options", {
    query: { cart_id: cartId, fields: "+service_zone.fulfillment_set.type,+type.code" },
    next,
    headers,
    cache: "no-store",
  })
}
