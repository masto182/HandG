import { retrieveCart, applyApprovedOffersToCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { getVariantInventory } from "@lib/data/inventory"
import CartTemplate from "@modules/cart/templates"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Cart",
  description: "View your cart",
}

export default async function Cart() {
  let cart = await retrieveCart().catch((error) => {
    console.error(error)
    return notFound()
  })

  // Apply any approved buy-at-price offer for items in this cart (the promo is
  // is_automatic but Medusa doesn't auto-apply it on line-item add). Use the
  // returned discounted cart for render when something was applied.
  const discounted = await applyApprovedOffersToCart(cart)
  if (discounted) {
    cart = discounted
  }

  const customer = await retrieveCustomer()

  const variantIds =
    (cart?.items?.map((i) => i.variant_id).filter(Boolean) as string[]) || []
  const inventoryMap = await getVariantInventory(variantIds)

  return (
    <CartTemplate cart={cart} customer={customer} inventoryMap={inventoryMap} />
  )
}
