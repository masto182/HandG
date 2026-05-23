import { retrieveCart } from "@lib/data/cart"
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
  const cart = await retrieveCart().catch((error) => {
    console.error(error)
    return notFound()
  })

  const customer = await retrieveCustomer()

  const variantIds = cart?.items?.map((i) => i.variant_id).filter(Boolean) as string[] || []
  const inventoryMap = await getVariantInventory(variantIds)

  return <CartTemplate cart={cart} customer={customer} inventoryMap={inventoryMap} />
}
