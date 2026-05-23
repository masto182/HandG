import Link from "next/link"
import { listBreweries } from "@lib/data/breweries"
import { getMembershipStatus, isApprovedMember } from "@lib/data/membership"
import { breweryLabel } from "@lib/util/brewery-label"
import { Metadata } from "next"

export async function generateMetadata(): Promise<Metadata> {
  const membershipStatus = await getMembershipStatus()
  const isApproved = isApprovedMember(membershipStatus)
  return {
    title: `${breweryLabel(isApproved)} | Hops & Glory`,
    description: isApproved
      ? "Cult producers, global legends, and the future of brewing."
      : "The world's most sought-after sources. Curated for collectors.",
  }
}

function getBadge(brewery: any) {
  const meta = brewery.metadata as any
  if (meta?.badge) return meta.badge
  if (meta?.status === "fresh_drop") return "Fresh Drop"
  if (meta?.status === "vaulted") return "Vaulted"
  if (meta?.status === "ultra_rare") return "Ultra Rare"
  return null
}

function getBadgeClasses(badge: string) {
  const lower = badge.toLowerCase()
  if (lower.includes("fresh")) return "bg-hl-accent text-hg-on-primary"
  if (lower.includes("vault")) return "bg-hl-primary text-white"
  if (lower.includes("ultra") || lower.includes("rare")) return "bg-amber-600 text-white"
  return "bg-hl-primary text-white"
}

export default async function BreweriesPage() {
  const breweries = await listBreweries()
  const membershipStatus = await getMembershipStatus()
  const isApproved = isApprovedMember(membershipStatus)

  return (
    <div className="max-w-[1440px] mx-auto px-6 pt-24 pb-20 min-h-screen">
      <header className="py-16">
        <div className="max-w-3xl">
          <h1 className="text-h1 text-hg-text mb-4">
            {breweryLabel(isApproved)}
          </h1>
          <p className="text-lg leading-relaxed text-hg-text-muted max-w-xl">
            {isApproved
              ? "Cult producers, global legends, and the future of brewing."
              : "The world's most sought-after sources. Curated for collectors."}
          </p>
        </div>
      </header>

      {breweries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {breweries.map((brewery: any) => {
            const badge = getBadge(brewery)
            return (
              <div
                key={brewery.id}
                className="rounded-xl overflow-hidden flex flex-col group transition-transform duration-300 hover:-translate-y-1 border border-hg-border/50"
                style={{
                  background: "color-mix(in srgb, var(--color-surface) 60%, transparent)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <Link href={`/breweries/${brewery.slug}`} className="block">
                  <div className="h-48 w-full overflow-hidden relative">
                    {brewery.hero_image_url || brewery.logo_url ? (
                      <img
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        src={brewery.hero_image_url || brewery.logo_url}
                        alt={brewery.name}
                      />
                    ) : (
                      <div className="w-full h-full bg-hg-surface-dim flex items-center justify-center">
                        <span className="text-hg-text-muted text-4xl font-bold opacity-20">
                          {brewery.name?.charAt(0)}
                        </span>
                      </div>
                    )}
                    {badge && (
                      <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${getBadgeClasses(badge)}`}>
                        {badge}
                      </div>
                    )}
                  </div>
                </Link>
                <div className="p-6 flex-grow flex flex-col">
                  <Link href={`/breweries/${brewery.slug}`} className="block">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-h3 text-hg-text">
                        {brewery.name}
                      </h3>
                      {brewery.location && (
                        <span className="text-hl-primary text-xs font-semibold uppercase tracking-widest whitespace-nowrap ml-2">
                          {brewery.location}
                        </span>
                      )}
                    </div>
                    {brewery.description && (
                      <p className="text-sm text-hg-text-muted mb-6 leading-relaxed line-clamp-3">
                        {brewery.description}
                      </p>
                    )}
                  </Link>
                  <div className="mt-auto flex items-center justify-between pt-6 border-t border-hg-border/30">
                    <div className="flex gap-4">
                      {brewery.website_url && (
                        <a href={brewery.website_url} target="_blank" rel="noopener noreferrer" className="text-hg-text-muted hover:text-hl-primary transition-colors">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>
                        </a>
                      )}
                      {brewery.instagram_url && (
                        <a href={brewery.instagram_url} target="_blank" rel="noopener noreferrer" className="text-hg-text-muted hover:text-hl-primary transition-colors">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
                        </a>
                      )}
                    </div>
                    <Link href={`/breweries/${brewery.slug}`} className="text-hl-primary text-xs font-bold uppercase tracking-tight">
                      View Releases →
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-hg-text-muted">No producers currently listed.</p>
      )}

      <div className="mt-20 flex justify-center">
        <button className="border border-hg-border text-hg-text hover:border-hl-primary hover:text-hl-primary transition-all duration-300 px-12 py-4 rounded-full text-xs font-semibold uppercase tracking-widest flex items-center gap-3">
          View All Partners
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  )
}
