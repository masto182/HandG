import { HttpTypes } from "@medusajs/types"

export const isPickupShippingOption = (o: any): boolean => {
  if (o.type?.code?.includes("pickup")) return true
  if (o.service_zone?.fulfillment_set?.type === "pickup") return true
  if (/pickup/i.test(o.name ?? "")) return true
  return false
}

export const getPickupOptions = (
  options: HttpTypes.StoreCartShippingOption[] | null
) => {
  return (options ?? []).filter((o: any) => isPickupShippingOption(o))
}

export const getDeliveryOptions = (
  options: HttpTypes.StoreCartShippingOption[] | null
) => {
  return (options ?? []).filter((o: any) => !isPickupShippingOption(o))
}
