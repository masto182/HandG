import Link from "next/link"
import { listHops } from "@lib/data/hops"
import { getMyHopAlerts } from "@lib/data/hop-alerts"
import { getMembershipStatus, isApprovedMember } from "@lib/data/membership"
import AlertHopButton from "@modules/hops/components/alert-hop-button"
import PageVisitTracker from "@modules/account/components/page-visit-tracker"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Hops | Hops & Glory",
  description: "Browse releases by the hop varietals that define them.",
}

const COUNTRY_TABS = [
  { code: null, label: "All" },
  { code: "NZ", label: "New Zealand" },
  { code: "AU", label: "Australia" },
  { code: "US", label: "United States" },
  { code: "EU", label: "Europe" },
]

type Props = {
  searchParams: Promise<{ country?: string }>
}

export default async function HopsPage({ searchParams }: Props) {
  const { country: selectedCountry } = await searchParams

  const [hops, membership, myAlerts] = await Promise.all([
    listHops(),
    getMembershipStatus(),
    getMyHopAlerts(),
  ])
  const isApproved = isApprovedMember(membership)
  const alertedHopIds = new Set(myAlerts.map((a) => a.hop_id))

  const filteredHops = selectedCountry
    ? hops.filter((h) => h.country_code === selectedCountry)
    : hops

  return (
    <div className="max-w-[1440px] mx-auto px-6 pt-24 pb-20 min-h-screen">
      <PageVisitTracker stepId="browse_hops" />
      <header className="py-8 small:py-16">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-hg-text-muted mb-3">
            Explore by
          </p>
          <h1 className="text-h1 text-hg-text mb-4">Hops</h1>
          <p className="text-lg leading-relaxed text-hg-text-muted max-w-xl">
            Browse releases by the hop varietals that define them.
          </p>
          {hops.length > 0 && (
            <p className="text-sm text-hg-text-muted mt-2">
              {filteredHops.length} hops
            </p>
          )}
        </div>
      </header>

      {/* Country filter tabs */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {COUNTRY_TABS.map(({ code, label }) => {
          const isActive =
            selectedCountry === code || (!selectedCountry && !code)
          return (
            <Link
              key={label}
              href={code ? `/hops?country=${code}` : "/hops"}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                isActive
                  ? "bg-hg-gold text-hg-on-primary border-hg-gold"
                  : "border-hg-border text-hg-text-muted hover:text-hg-text hover:border-hg-accent"
              }`}
            >
              {label}
            </Link>
          )
        })}
      </div>

      {filteredHops.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 small:grid-cols-3 gap-6">
          {filteredHops.map((hop) => {
            const flavors: string[] = hop.flavor_profile
              ? hop.flavor_profile
                  .split(",")
                  .map((f: string) => f.trim())
                  .filter(Boolean)
                  .slice(0, 4)
              : []
            return (
              <div
                key={hop.id}
                className="rounded-xl flex flex-col group transition-all duration-200 hover:-translate-y-0.5 border border-hg-border"
                style={{
                  background:
                    "color-mix(in srgb, var(--color-surface) 60%, transparent)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <div className="p-5 flex-grow flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-hg-text group-hover:text-hg-gold transition-colors">
                      {hop.name}
                    </h3>
                    <div className="flex flex-col items-end gap-1 ml-3">
                      {hop.country_code && (
                        <span className="text-xs font-semibold text-hg-accent uppercase tracking-widest whitespace-nowrap">
                          {hop.country_code}
                        </span>
                      )}
                      {hop.origin && (
                        <span className="text-xs font-medium text-hg-text-muted uppercase tracking-widest whitespace-nowrap flex items-center gap-1">
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          {hop.origin}
                        </span>
                      )}
                    </div>
                  </div>

                  {flavors.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {flavors.map((f) => (
                        <span
                          key={f}
                          className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            background: "var(--color-accent-soft)",
                            color: "var(--color-accent)",
                          }}
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-hg-border/30">
                    <span className="text-xs text-hg-text-muted">
                      {hop.product_count ?? 0} releases
                    </span>
                    <div className="flex items-center gap-3">
                      {isApproved && (
                        <AlertHopButton
                          hopId={hop.id}
                          initialAlerted={alertedHopIds.has(hop.id)}
                          variant="pill"
                        />
                      )}
                      <Link
                        href={`/hops/${hop.slug}`}
                        className="text-hl-primary text-xs font-bold uppercase tracking-tight hover:text-hg-gold transition-colors"
                      >
                        View releases →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-hg-text-muted">
          {selectedCountry
            ? `No hops from ${COUNTRY_TABS.find((t) => t.code === selectedCountry)?.label || selectedCountry}.`
            : "No hops currently listed."}
        </p>
      )}
    </div>
  )
}
