import { Metadata } from "next"
import { Suspense } from "react"
import { redirect } from "next/navigation"
import ApplyForm from "@modules/apply/components/apply-form"
import { getMembershipStatus, isApprovedMember } from "@lib/data/membership"

export const metadata: Metadata = {
  title: "Apply for Membership | Hops & Glory",
  description: "Apply to join the most exclusive private collection of limited-release cans.",
}

export default async function ApplyPage() {
  const membershipStatus = await getMembershipStatus()

  if (isApprovedMember(membershipStatus)) {
    redirect("/account")
  }

  if (membershipStatus === "pending") {
    redirect("/apply/pending")
  }

  return (
    <main>
      <section className="relative min-h-[400px] w-full overflow-hidden flex flex-col items-center justify-center text-center px-6 py-24">
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-surface-container-low via-transparent to-surface-container-low" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <span className="text-label-caps uppercase tracking-[0.2em] text-primary mb-4 block">MEMBERS ONLY</span>
          <h1 className="text-h1 text-on-surface mb-4">A club you earn your way into</h1>
          <p className="text-body-lg text-on-surface-variant max-w-xl mx-auto">
            No subscription. No waitlist tricks. Just an application.
          </p>
        </div>
      </section>

      <section className="relative z-20 -mt-12 pb-24 px-6">
        <div className="max-w-[560px] mx-auto">
          <div className="flex items-center justify-center gap-4 mb-10">
            <div className="flex items-center gap-2 bg-primary-container/20 px-4 py-1.5 rounded-full border border-primary/30">
              <span className="w-6 h-6 rounded-full bg-primary text-on-primary text-[12px] font-bold flex items-center justify-center">1</span>
              <span className="text-label-caps text-primary">Apply</span>
            </div>
            <div className="h-px w-8 bg-outline-variant/30" />
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-outline-variant/30 opacity-50">
              <span className="w-6 h-6 rounded-full bg-surface-container-high text-on-surface-variant text-[12px] font-bold flex items-center justify-center">2</span>
              <span className="text-label-caps text-on-surface-variant">Review</span>
            </div>
            <div className="h-px w-8 bg-outline-variant/30" />
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-outline-variant/30 opacity-50">
              <span className="w-6 h-6 rounded-full bg-surface-container-high text-on-surface-variant text-[12px] font-bold flex items-center justify-center">3</span>
              <span className="text-label-caps text-on-surface-variant">Welcome</span>
            </div>
          </div>

          <div className="bg-surface-container-low p-8 rounded-xl border border-outline-variant/20 shadow-lg">
            <Suspense fallback={<div className="w-full h-96 animate-pulse bg-surface-container rounded-lg" />}>
              <ApplyForm />
            </Suspense>
          </div>
        </div>
      </section>
    </main>
  )
}
