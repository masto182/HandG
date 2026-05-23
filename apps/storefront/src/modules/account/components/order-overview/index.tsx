"use client"

import { useState } from "react"
import OrderCard from "../order-card"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"

const FILTERS = [
  { key: "all", label: "All" },
  { key: "awaiting", label: "Awaiting payment" },
  { key: "pickup", label: "Awaiting pickup" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
  { key: "canceled", label: "Cancelled" },
]

function getOrderStatus(order: HttpTypes.StoreOrder): string {
  const status = (order as any).fulfillment_status || (order as any).status || ""
  if (status === "canceled" || status === "cancelled") return "canceled"
  if (status === "delivered" || status === "completed") return "delivered"
  if (status === "shipped" || status === "partially_shipped") return "shipped"
  if (status === "awaiting" || status === "not_fulfilled") {
    const paymentStatus = (order as any).payment_status
    if (paymentStatus === "awaiting" || paymentStatus === "not_paid") return "awaiting"
    return "pickup"
  }
  return "all"
}

const OrderOverview = ({ orders }: { orders: HttpTypes.StoreOrder[] }) => {
  const [activeFilter, setActiveFilter] = useState("all")
  const [visibleCount, setVisibleCount] = useState(5)

  const filteredOrders = activeFilter === "all"
    ? orders
    : orders.filter((o) => getOrderStatus(o) === activeFilter)

  const visibleOrders = filteredOrders.slice(0, visibleCount)
  const hasMore = filteredOrders.length > visibleCount

  if (orders?.length) {
    return (
      <div className="w-full space-y-8">
        <div className="flex flex-wrap gap-3">
          {FILTERS.map((filter) => (
            <button
              key={filter.key}
              onClick={() => { setActiveFilter(filter.key); setVisibleCount(5) }}
              className={`px-5 py-2 rounded-full text-label-caps transition-colors ${
                activeFilter === filter.key
                  ? "border border-primary bg-primary/10 text-primary"
                  : "border border-outline-variant/50 text-on-surface-variant hover:border-on-surface-variant"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {filteredOrders.length === 0 ? (
          <div className="py-12 text-center text-on-surface-variant text-body-md">
            No orders match this filter.
          </div>
        ) : (
          <div className="space-y-6">
            {visibleOrders.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </div>
        )}

        {hasMore && (
          <div className="flex justify-center pt-4">
            <button
              onClick={() => setVisibleCount((c) => c + 5)}
              className="flex items-center gap-2 px-6 py-3 text-on-surface-variant font-bold hover:text-primary transition-colors group"
            >
              <svg className="w-4 h-4 transition-transform group-hover:translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <span>Load earlier orders</span>
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full" data-testid="no-orders-container">
      <div className="border border-outline-variant/30 border-dashed rounded-xl p-12 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <div className="absolute mt-12 ml-8">
            <svg className="w-4 h-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <h2 className="text-h3 font-bold text-on-surface mb-2">No orders yet</h2>
        <p className="text-body-md text-on-surface-variant max-w-md mb-8">
          Your cellar is currently awaiting its first vintage. Start your collection by exploring our curated selection of ultra-limited brewery collaborations.
        </p>
        <LocalizedClientLink href="/" passHref>
          <button className="bg-primary text-on-primary font-bold px-8 py-4 rounded-lg flex items-center gap-3 active:scale-95 transition-transform hover:brightness-110" data-testid="continue-shopping-button">
            Browse the Collection
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default OrderOverview
