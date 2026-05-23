import { MembershipStatus, isApprovedMember } from "@lib/data/membership"

type HeroProps = {
  membershipStatus: MembershipStatus
  newDropsCount?: number
  lowStockCount?: number
}

const Hero = ({ membershipStatus, newDropsCount = 0, lowStockCount = 0 }: HeroProps) => {
  const isApproved = isApprovedMember(membershipStatus)
  const isPending = membershipStatus === "pending"

  if (isApproved) {
    return (
      <div className="w-full border-b border-hg-border/50" style={{ background: "linear-gradient(180deg, var(--color-surface-2) 0%, var(--color-bg) 100%)" }}>
        <div className="content-container py-6 small:py-8">
          <div className="flex flex-col small:flex-row small:items-center small:justify-between gap-4">
            <div>
              <h1 className="text-xl small:text-2xl font-bold text-hg-text">
                Welcome back
              </h1>
              <p className="text-sm text-hg-text-secondary mt-1">
                {newDropsCount > 0
                  ? `${newDropsCount} new drops this week`
                  : "Browse the latest releases"}
                {lowStockCount > 0 && ` · ${lowStockCount} beers running low`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="/store?sortBy=created_at"
                className="px-4 py-2 text-sm font-medium bg-hg-gold/10 border border-hg-gold/30 text-hg-gold rounded-lg hover:bg-hg-gold/20 transition-colors"
              >
                New Drops
              </a>
              <a
                href="/store?view=list&sortBy=stock_asc"
                className="px-4 py-2 text-sm font-medium bg-hg-surface border border-hg-border text-hg-text-secondary rounded-lg hover:border-hg-gold/30 hover:text-hg-text transition-colors"
              >
                Low Stock
              </a>
              <a
                href="/store"
                className="px-4 py-2 text-sm font-medium bg-hg-surface border border-hg-border text-hg-text-secondary rounded-lg hover:border-hg-gold/30 hover:text-hg-text transition-colors"
              >
                Full Collection
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <section className="relative h-[85vh] min-h-[600px] w-full flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="w-full h-full object-cover scale-105"
          src="/images/hero-bg.jpg"
          alt="Exclusive private collection"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)]/40 to-transparent" />
        <div className="absolute inset-0 bg-black/40" />
      </div>
      <div className="relative z-10 text-center px-6 max-w-4xl">
        <span className="text-xs font-semibold tracking-[0.3em] uppercase text-hg-gold mb-4 block">
          ESTABLISHED MMXXIV
        </span>
        <h1 className="text-4xl small:text-5xl font-bold text-white leading-[1.1] tracking-tight mb-6 text-balance">
          The world&apos;s most coveted, limited releases. Curated for the few.
        </h1>
        <p className="text-lg text-white/70 mb-10 max-w-2xl mx-auto leading-relaxed">
          For the few who strive for the very best. Ultra-limited editions, secured by invitation.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {isPending ? (
            <span className="bg-hg-gold/20 text-hg-gold px-10 py-4 rounded-lg font-semibold text-lg cursor-default">
              Application Pending
            </span>
          ) : (
            <a
              href="/apply"
              className="bg-hg-gold text-white px-10 py-4 rounded-lg font-semibold text-lg hover:opacity-90 transition-all"
            >
              Apply for Membership
            </a>
          )}
          <a
            href="/store"
            className="border border-white/30 text-white px-10 py-4 rounded-lg font-semibold text-lg hover:bg-white/5 transition-all backdrop-blur-md"
          >
            Explore Archive
          </a>
        </div>
      </div>
    </section>
  )
}

export default Hero
