import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getHeatHold } from "@lib/data/heat-hold"
import { getMembershipStatus, isApprovedMember } from "@lib/data/membership"

export const metadata: Metadata = {
  title: "Shipping & Delivery | Hops & Glory",
  description: "How we deliver rare releases to your door — fast, protected, and intact.",
}

export default async function ShippingPage() {
  const membershipStatus = await getMembershipStatus()
  if (!isApprovedMember(membershipStatus)) {
    redirect("/")
  }

  const heatHold = await getHeatHold()

  return (
    <div className="content-container py-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-hg-text mb-2">Shipping & Delivery</h1>
      <p className="text-hg-text-secondary mb-10">How we get it to your door.</p>

      {heatHold.enabled ? (
        <div
          className="bg-amber-50 border border-amber-300 text-amber-900 rounded-xl p-5 mb-8 text-sm leading-relaxed"
          role="status"
        >
          <p className="font-semibold mb-1">Heat hold is currently active</p>
          <p>{heatHold.message}</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-8">
        <section>
          <h2 className="text-lg font-semibold text-hg-text mb-3">Live carrier rates</h2>
          <p className="text-sm text-hg-text-secondary leading-relaxed">
            We ship Australia-wide via Australia Post, CouriersPlease, and Aramex Australia. At
            checkout we quote each enabled carrier in real time and automatically pick the cheapest
            available rate for your shipment. Express options are surfaced when delivery time
            matters more than cost.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-hg-text mb-3">Delivery times</h2>
          <div className="bg-hg-surface border border-hg-border rounded-xl p-5">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-hg-text font-medium">Metro (VIC, NSW, QLD)</p>
                <p className="text-hg-text-secondary">1–3 business days</p>
              </div>
              <div>
                <p className="text-hg-text font-medium">Metro (SA, WA, TAS)</p>
                <p className="text-hg-text-secondary">3–5 business days</p>
              </div>
              <div>
                <p className="text-hg-text font-medium">Regional</p>
                <p className="text-hg-text-secondary">5–7 business days</p>
              </div>
              <div>
                <p className="text-hg-text font-medium">Express (all metro)</p>
                <p className="text-hg-text-secondary">Next business day</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-hg-text mb-3">Cold chain & heat hold</h2>
          <p className="text-sm text-hg-text-secondary leading-relaxed">
            All orders are packed cold with insulated liners and ice packs. We dispatch Monday to
            Wednesday to avoid weekend delays. During heat events (35°C+ along the route), shipments
            are temporarily held to protect product integrity and dispatched on the next safe day.
            You&apos;ll receive an email if your order is held.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-hg-text mb-3">Tracking</h2>
          <p className="text-sm text-hg-text-secondary leading-relaxed">
            You&apos;ll receive a tracking number via email once your order is dispatched. Real-time
            tracking is available through the link in your confirmation email or via your account
            under Orders.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-hg-text mb-3">Pickup</h2>
          <p className="text-sm text-hg-text-secondary leading-relaxed">
            Prefer to collect? Pickup is free at our Hillside location during scheduled windows.
            Choose pickup at checkout to skip shipping fees entirely.
          </p>
        </section>
      </div>
    </div>
  )
}
