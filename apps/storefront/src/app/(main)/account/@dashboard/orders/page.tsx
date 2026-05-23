import { Metadata } from "next"

import OrderOverview from "@modules/account/components/order-overview"
import { notFound } from "next/navigation"
import { listOrders } from "@lib/data/orders"

export const metadata: Metadata = {
  title: "Orders",
  description: "Overview of your previous orders.",
}

export default async function Orders() {
  const orders = await listOrders()

  if (!orders) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="orders-page-wrapper">
      <header className="mb-10">
        <h1 className="text-h1 text-on-surface mb-2">Orders</h1>
        <p className="text-body-lg text-on-surface-variant">Every drop you&apos;ve secured.</p>
      </header>
      <OrderOverview orders={orders} />
    </div>
  )
}
