import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { breweryLabel } from "@lib/util/brewery-label"

type Brewery = {
  id: string
  name: string
  slug: string
  location: string | null
  description: string | null
  image_url?: string | null
}

type FeaturedBreweriesProps = {
  breweries: Brewery[]
  canSeePricing?: boolean
  isApproved?: boolean
}

const PLACEHOLDER_IMAGES = [
  "/images/brewery-1.jpg",
  "/images/brewery-2.jpg",
  "/images/brewery-3.jpg",
]

const FeaturedBreweries = ({ breweries, isApproved = false }: FeaturedBreweriesProps) => {
  if (!breweries?.length) return null

  return (
    <section className="py-16 bg-[var(--color-bg)] border-t border-hg-border/30">
      <div className="max-w-[1440px] mx-auto px-6">
        <div className="mb-12 text-center">
          <span className="text-hg-gold text-xs font-semibold uppercase tracking-[0.15em] mb-1 block">
            The Masters
          </span>
          <h2 className="text-h2 text-hg-text">
            Featured {breweryLabel(isApproved)}
          </h2>
          <div className="w-12 h-0.5 bg-hg-gold mx-auto mt-4" />
        </div>
        <div className="grid grid-cols-1 small:grid-cols-3 gap-6">
          {breweries.slice(0, 3).map((brewery, idx) => (
            <LocalizedClientLink
              key={brewery.id}
              href={`/breweries/${brewery.slug}`}
              className="relative group h-[480px] rounded-xl overflow-hidden border border-hg-border block"
            >
              <div
                className="absolute inset-0 w-full h-full bg-[var(--color-surface-2)] transition-transform duration-700 group-hover:scale-110"
                style={{
                  backgroundImage: brewery.image_url
                    ? `url(${brewery.image_url})`
                    : `url(${PLACEHOLDER_IMAGES[idx % 3]})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 p-6 w-full">
                <h3 className="text-h2 text-white mb-1">
                  {brewery.name}
                </h3>
                {brewery.description && (
                  <p className="text-sm text-white/60 mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 line-clamp-2">
                    {brewery.description}
                  </p>
                )}
                <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.15em] text-hg-gold group-hover:gap-2 transition-all">
                  View Collection
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </span>
              </div>
            </LocalizedClientLink>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FeaturedBreweries
