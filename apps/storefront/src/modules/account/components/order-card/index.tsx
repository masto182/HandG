import { useMemo } from "react"

import Thumbnail from "@modules/products/components/thumbnail"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { convertToLocale } from "@lib/util/money"
import { PAYID_ALIAS } from "@lib/constants/payment"
import { HttpTypes } from "@medusajs/types"

type OrderCardProps = {
  order: HttpTypes.StoreOrder
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  awaiting_payment: { label: "Awaiting PayID", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  not_paid: { label: "Awaiting PayID", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  awaiting: { label: "Awaiting Payment", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  pending: { label: "Pending", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  shipped: { label: "Shipped", className: "bg-blue-500/10 text-blue-400 border-blue-400/20" },
  partially_shipped: { label: "Shipped", className: "bg-blue-500/10 text-blue-400 border-blue-400/20" },
  delivered: { label: "Delivered", className: "bg-primary/10 text-primary border-primary/20" },
  completed: { label: "Delivered", className: "bg-primary/10 text-primary border-primary/20" },
  canceled: { label: "Cancelled", className: "bg-error/10 text-error border-error/20" },
  cancelled: { label: "Cancelled", className: "bg-error/10 text-error border-error/20" },
  requires_action: { label: "Action Required", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
}

function getStatusBadge(order: HttpTypes.StoreOrder) {
  const paymentStatus = (order as any).payment_status || ""
  const fulfillmentStatus = (order as any).fulfillment_status || ""
  const status = (order as any).status || ""

  const key = fulfillmentStatus || paymentStatus || status || "pending"
  const config = STATUS_CONFIG[key] || STATUS_CONFIG.pending
  return config
}

const OrderCard = ({ order }: OrderCardProps) => {
  const numberOfProducts = useMemo(() => order.items?.length ?? 0, [order])
  const statusBadge = getStatusBadge(order)
  const isAwaitingPayment = statusBadge.label.includes("Awaiting")
  const isDelivered = statusBadge.label === "Delivered"
  const shippingMethodName = (order.shipping_methods?.[0] as { name?: string })?.name ?? ""
  const isPickup = /pickup/i.test(shippingMethodName)

  return (
    <div className="bg-surface-container rounded-xl border border-outline-variant/20 overflow-hidden transition-all hover:border-primary/30" data-testid="order-card">
      <div className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="font-bold text-on-surface text-lg" data-testid="order-display-id">
                Order #{order.display_id}
              </span>
              <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded border ${statusBadge.className}`}>
                {statusBadge.label}
              </span>
            </div>
            <p className="text-body-sm text-on-surface-variant" data-testid="order-created-at">
              Placed on {new Date(order.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Total Amount</p>
            <p className="text-price font-bold text-primary" data-testid="order-amount">
              {convertToLocale({
                amount: order.total,
                currency_code: order.currency_code,
              })}
            </p>
          </div>
        </div>

        {isAwaitingPayment && (
          <div className="bg-amber-500/5 border-l-4 border-amber-500 p-4 rounded-r-lg mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <div>
                <p className="text-amber-500 font-bold text-body-sm">PayID: {PAYID_ALIAS}</p>
                <p className="text-on-surface-variant text-xs">Reference: <span className="font-mono text-on-surface">HG-{order.display_id}-X</span></p>
              </div>
            </div>
            <button className="text-[10px] font-bold uppercase tracking-wider text-on-surface underline decoration-amber-500/50 hover:decoration-amber-500 underline-offset-4">
              Copy Details
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-end gap-6">
          <div className="flex gap-3">
            {order.items?.slice(0, 3).map((item) => (
              <div key={item.id} className="w-16 h-16 rounded-lg overflow-hidden border border-outline-variant/30 bg-surface-container-high" data-testid="order-item">
                <Thumbnail thumbnail={item.thumbnail} images={[]} size="square" />
              </div>
            ))}
            {numberOfProducts > 3 && (
              <div className="w-16 h-16 rounded-lg flex items-center justify-center border border-dashed border-outline-variant/50 bg-surface-container-high">
                <span className="text-xs font-bold text-on-surface-variant">+{numberOfProducts - 3} more</span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            {isDelivered && !isPickup && (
              <button className="px-5 py-3 text-on-surface-variant font-bold rounded-lg text-body-sm hover:text-on-surface transition-colors">
                Track shipment
              </button>
            )}
            <LocalizedClientLink href={`/account/orders/details/${order.id}`}>
              <button className="px-6 py-3 bg-surface-container-high border border-outline-variant/30 text-on-surface font-bold rounded-lg text-body-sm hover:bg-surface-container-highest transition-colors" data-testid="order-details-link">
                View details
              </button>
            </LocalizedClientLink>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrderCard
