export const STORE_EVENT_TYPES = [
  "product.viewed",
  "brewery.viewed",
  "filter.applied",
  "cart.viewed",
  "cart.item_added",
  "checkout.step_reached",
  "checkout.address_submitted",
  "checkout.fulfilment_selected",
  "checkout.shipping_method_selected",
  "order.confirmation_viewed",
] as const

export type StoreEventType = (typeof STORE_EVENT_TYPES)[number]

export const ANALYTICS_EVENT_TYPES = [...STORE_EVENT_TYPES, "order.completed"] as const

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number]
