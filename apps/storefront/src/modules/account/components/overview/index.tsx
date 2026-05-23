"use client"

import { useEffect, useState } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import Icon from "@modules/common/components/icon"
import { sdk } from "@lib/config"

type VipData = {
  tier: string
  score: { personal_spend: number; network_bonus: number; total: number }
  orders_12mo: number
  next_tier: {
    tier: string
    requirements: { orders: number; score: number }
    progress: { orders_needed: number; score_needed: number }
  } | null
}

type OverviewProps = {
  customer: HttpTypes.StoreCustomer | null
  orders: HttpTypes.StoreOrder[] | null
}

const TIER_LABELS: Record<string, string> = {
  approved: "Member",
  vip1: "VIP 1",
  vip2: "VIP 2",
  vip3: "VIP 3",
  vip4: "VIP 4",
  vip5: "VIP 5",
}

const Overview = ({ customer, orders }: OverviewProps) => {
  const [vip, setVip] = useState<VipData | null>(null)

  useEffect(() => {
    sdk.client.fetch<any>("/store/customers/me/vip", { method: "GET" })
      .then(setVip)
      .catch(() => {})
  }, [])

  const tierLabel = vip ? (TIER_LABELS[vip.tier] || "Member") : "Member"
  const openOrders = orders?.filter((o) => o.fulfillment_status !== "delivered" && o.fulfillment_status !== "canceled")?.length || 0
  const totalScore = vip?.score.total || 0

  const nextTierLabel = vip?.next_tier ? (TIER_LABELS[vip.next_tier.tier] || vip.next_tier.tier) : null
  const scoreNeeded = vip?.next_tier?.progress.score_needed || 0
  const scoreThreshold = vip?.next_tier?.requirements.score || 1
  const progressPct = vip?.next_tier
    ? Math.min(100, Math.round(((scoreThreshold - scoreNeeded) / scoreThreshold) * 100))
    : 100

  return (
    <div data-testid="overview-page-wrapper">
      <div className="mb-8">
        <h1 className="text-h2 text-hg-text" data-testid="welcome-message" data-value={customer?.first_name}>
          Welcome back, {customer?.first_name}
        </h1>
        <p className="text-body-md text-hg-text-secondary mt-1">
          {tierLabel && <span className="text-hg-gold font-semibold">{tierLabel}</span>}
          {" · "}
          <span data-testid="customer-email" data-value={customer?.email}>{customer?.email}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 small:grid-cols-3 gap-4 mb-8">
        <div className="glass-card p-5 rounded-xl border border-hg-border hover:border-hg-gold/30 transition-all">
          <div className="flex justify-between items-start mb-3">
            <Icon name="military_tech" size={22} className="text-hg-gold" />
            <span className="text-[10px] font-bold text-hg-text-secondary uppercase tracking-widest">{tierLabel}</span>
          </div>
          <h3 className="text-label-caps uppercase tracking-[0.05em] text-hg-text-secondary mb-1">VIP Score</h3>
          <p className="text-h2 text-hg-text">{totalScore}</p>
        </div>

        <div className="glass-card p-5 rounded-xl border border-hg-border hover:border-hg-gold/30 transition-all">
          <div className="flex justify-between items-start mb-3">
            <Icon name="local_shipping" size={22} className="text-hg-gold" />
            {openOrders > 0 && <span className="text-[10px] font-bold text-hl-accent uppercase tracking-widest">Active</span>}
          </div>
          <h3 className="text-label-caps uppercase tracking-[0.05em] text-hg-text-secondary mb-1">Open Orders</h3>
          <p className="text-h2 text-hg-text">{openOrders}</p>
        </div>

        <div className="glass-card p-5 rounded-xl border border-hg-border hover:border-hg-gold/30 transition-all">
          <div className="flex justify-between items-start mb-3">
            <Icon name="hub" size={22} className="text-hg-gold" />
          </div>
          <h3 className="text-label-caps uppercase tracking-[0.05em] text-hg-text-secondary mb-1">Orders (12 mo)</h3>
          <p className="text-h2 text-hg-text">{vip?.orders_12mo || orders?.length || 0}</p>
        </div>
      </div>

      {vip?.next_tier && (
        <div className="glass-card p-6 rounded-xl border border-hg-border mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-hg-gold/5 to-transparent opacity-50" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-hg-gold">Current: {tierLabel}</span>
              <div className="h-1 w-1 rounded-full bg-hg-border" />
              <span className="text-xs font-bold uppercase tracking-widest text-hg-text-secondary">Next: {nextTierLabel}</span>
            </div>
            <h2 className="text-h3 text-hg-text mb-4">{scoreNeeded} pts to {nextTierLabel}</h2>
            <div className="w-full h-2.5 bg-hg-surface-hover rounded-full overflow-hidden mb-2">
              <div className="h-full bg-hg-gold rounded-full transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="flex justify-between text-xs font-medium text-hg-text-secondary">
              <span>{scoreThreshold - scoreNeeded} earned</span>
              <span>{scoreThreshold} threshold</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 large:grid-cols-2 gap-6">
        <div className="glass-card rounded-xl border border-hg-border flex flex-col">
          <div className="p-5 border-b border-hg-border/50 flex justify-between items-center">
            <h3 className="text-body-md font-semibold text-hg-text">Latest Orders</h3>
            <LocalizedClientLink href="/account/orders" className="text-hg-gold text-xs font-bold uppercase hover:underline">
              View All
            </LocalizedClientLink>
          </div>
          <div className="flex-1 p-5" data-testid="orders-wrapper">
            {orders && orders.length > 0 ? (
              <div className="space-y-4">
                {orders.slice(0, 3).map((order) => (
                  <LocalizedClientLink
                    key={order.id}
                    href={`/account/orders/details/${order.id}`}
                    className="flex items-center gap-4 group"
                    data-testid="order-wrapper"
                    data-value={order.id}
                  >
                    <div className="w-11 h-11 rounded-lg bg-hg-surface-hover flex items-center justify-center flex-shrink-0">
                      <Icon name="shopping_bag" size={20} className="text-hg-text-secondary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-hg-text truncate" data-testid="order-id" data-value={order.display_id}>
                        Order #{order.display_id}
                      </p>
                      <p className="text-xs text-hg-text-secondary" data-testid="order-created-date">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-hg-text" data-testid="order-amount">
                        {convertToLocale({ amount: order.total, currency_code: order.currency_code })}
                      </p>
                    </div>
                  </LocalizedClientLink>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Icon name="shopping_bag" size={32} className="text-hg-text-secondary/40 mb-2" />
                <span className="text-sm text-hg-text-secondary" data-testid="no-orders-message">No orders yet</span>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card rounded-xl border border-hg-border flex flex-col">
          <div className="p-5 border-b border-hg-border/50 flex justify-between items-center">
            <h3 className="text-body-md font-semibold text-hg-text">Wishlist</h3>
            <LocalizedClientLink href="/account/wishlist" className="text-hg-gold text-xs font-bold uppercase hover:underline">
              Manage
            </LocalizedClientLink>
          </div>
          <div className="flex-1 p-5 flex flex-col items-center justify-center py-8 text-center">
            <Icon name="favorite" size={32} className="text-hg-text-secondary/40 mb-2" />
            <span className="text-sm text-hg-text-secondary">View your saved items</span>
            <LocalizedClientLink href="/account/wishlist" className="mt-3 text-sm text-hg-gold font-medium hover:underline">
              Go to wishlist →
            </LocalizedClientLink>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Overview
