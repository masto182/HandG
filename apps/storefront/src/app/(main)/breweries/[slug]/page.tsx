import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { getMembershipStatus, isApprovedMember } from "@lib/data/membership"
import { breweryLabel } from "@lib/util/brewery-label"
import { getProductPrice } from "@lib/util/get-product-price"
import Thumbnail from "@modules/products/components/thumbnail"
import { getBreweryBySlug } from "@lib/data/breweries"
import { getBreweryCollabs } from "@lib/data/brewery-collabs"
import ProductPill from "@modules/products/components/product-pill"

type Props = {
  params: Promise<{ slug: string }>
}

async function getBrewery(slug: string) {
  return getBreweryBySlug(slug)
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params
  const brewery = await getBrewery(slug)

  if (!brewery) {
    return { title: "Supplier Not Found" }
  }

  return {
    title: `${brewery.name} | Hops & Glory`,
    description: brewery.description || `${brewery.name} — featured producer in the Hops & Glory private collection`,
  }
}



export default async function BreweryDetailPage(props: Props) {
  const { slug } = await props.params
  const brewery = await getBrewery(slug)

  if (!brewery) {
    notFound()
  }

  const membershipStatus = await getMembershipStatus()
  const canSeePricing = isApprovedMember(membershipStatus)

  const region = await getRegion("au")
  if (!region) return null

  let products: any[] = []
  try {
    const { response: { products: allProducts } } = await listProducts({
      queryParams: { limit: 100 },
      countryCode: "au",
    })

    products = (allProducts || []).filter((p: any) => {
      const meta = p.metadata as any
      const breweryName = meta?.brewery_name || meta?.brewery || ""
      return breweryName.toLowerCase() === brewery.name.toLowerCase()
    })
  } catch {}

  const collabs = await getBreweryCollabs(brewery.slug)

  const meta = brewery.metadata as any

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative h-[614px] min-h-[500px] w-full flex items-end pb-16 overflow-hidden">
        <div className="absolute inset-0 z-0">
          {brewery.hero_image_url ? (
            <img
              className="w-full h-full object-cover"
              src={brewery.hero_image_url}
              alt={brewery.name}
            />
          ) : brewery.logo_url ? (
            <img
              className="w-full h-full object-cover"
              src={brewery.logo_url}
              alt={brewery.name}
            />
          ) : (
            <div className="w-full h-full bg-hg-surface-dim" />
          )}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, var(--color-bg), color-mix(in srgb, var(--color-bg) 40%, transparent), transparent)" }}
          />
        </div>
        <div className="relative z-10 max-w-[1440px] mx-auto px-8 w-full">
          <div className="flex flex-col gap-2">
            {brewery.location && (
              <span className="text-xs font-semibold text-hl-primary tracking-[0.2em] uppercase">
                {brewery.location}
              </span>
            )}
            <h1 className="text-h1 text-hg-text">
              {brewery.name}
            </h1>
            <div className="flex gap-4 mt-6">
              <button className="px-8 py-3 bg-hl-primary text-white font-bold rounded-xl active:scale-95 transition-transform">
                Follow {breweryLabel(canSeePricing, false)}
              </button>
              <button className="px-8 py-3 bg-transparent border border-hg-border text-hg-text font-bold rounded-xl hover:bg-hg-surface active:scale-95 transition-transform">
                View Releases
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="max-w-[1440px] mx-auto px-8 py-20 grid grid-cols-1 lg:grid-cols-12 gap-16">
        {/* Left Column: Story & Specs */}
        <aside className="lg:col-span-4 flex flex-col gap-12">
          <div className="flex flex-col gap-6">
            <h2 className="text-h3 text-hg-text border-b border-hg-border pb-4">
              Our Heritage
            </h2>
            {brewery.description && (
              <p className="text-lg leading-relaxed text-hg-text-muted">
                {brewery.description}
              </p>
            )}
          </div>

          {/* Brewery Specs */}
          <div className="p-8 bg-hg-surface border border-hg-border rounded-xl">
            <h3 className="text-xs font-semibold text-hl-primary mb-8 uppercase tracking-widest">
              {breweryLabel(canSeePricing, false)} Specs
            </h3>
            <div className="grid grid-cols-1 gap-6">
              {meta?.founded && (
                <div className="flex justify-between items-center py-3 border-b border-hg-border/50">
                  <span className="text-hg-text-muted font-medium">Founded</span>
                  <span className="text-hg-text font-bold">{meta.founded}</span>
                </div>
              )}
              {meta?.head_brewer && (
                <div className="flex justify-between items-center py-3 border-b border-hg-border/50">
                  <span className="text-hg-text-muted font-medium">Head Brewer</span>
                  <span className="text-hg-text font-bold">{meta.head_brewer}</span>
                </div>
              )}
              {meta?.focus && (
                <div className="flex justify-between items-center py-3 border-b border-hg-border/50">
                  <span className="text-hg-text-muted font-medium">Focus</span>
                  <span className="text-hg-text font-bold">{meta.focus}</span>
                </div>
              )}
              {meta?.annual_production && (
                <div className="flex justify-between items-center py-3">
                  <span className="text-hg-text-muted font-medium">Annual Production</span>
                  <span className="text-hg-text font-bold">{meta.annual_production}</span>
                </div>
              )}
              {!meta?.founded && !meta?.head_brewer && !meta?.focus && !meta?.annual_production && (
                <>
                  <div className="flex justify-between items-center py-3 border-b border-hg-border/50">
                    <span className="text-hg-text-muted font-medium">Location</span>
                    <span className="text-hg-text font-bold">{brewery.location || "—"}</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-hg-text-muted font-medium">Products</span>
                    <span className="text-hg-text font-bold">{products.length}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Social Links */}
          <div className="flex gap-4">
            {brewery.website_url && (
              <a href={brewery.website_url} target="_blank" rel="noopener noreferrer" className="text-hg-text-muted hover:text-hl-primary transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>
              </a>
            )}
            {brewery.instagram_url && (
              <a href={brewery.instagram_url} target="_blank" rel="noopener noreferrer" className="text-hg-text-muted hover:text-hl-primary transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
              </a>
            )}
            {brewery.untappd_url && (
              <a href={brewery.untappd_url} target="_blank" rel="noopener noreferrer" className="text-hg-text-muted hover:text-hl-primary transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l1.5 3.5L17 8l-2.5 2.5.5 3.5L12 12.5 9 14l.5-3.5L7 8l3.5-1.5z" /><path d="M8 14l-2 7h12l-2-7" /></svg>
              </a>
            )}
          </div>
        </aside>

        {/* Right Column: Current Releases */}
        <section className="lg:col-span-8">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-h2 text-hg-text">
                Current Releases
              </h2>
              <p className="text-hg-text-muted mt-2">
                The latest collection from {brewery.name}.
              </p>
            </div>
            <Link
              href={`/store?brewery=${encodeURIComponent(brewery.name)}`}
              className="flex items-center gap-2 text-hl-primary font-bold text-sm group"
            >
              <span>View All Releases</span>
              <svg className="group-hover:translate-x-1 transition-transform" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </Link>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-y-12 gap-x-6">
              {products.slice(0, 6).map((product: any) => {
                const { cheapestPrice } = getProductPrice({ product })
                const pMeta = product.metadata as any
                const style = pMeta?.style || ""
                const abv = pMeta?.abv ? `${pMeta.abv}% ABV` : ""
                const isArchived = pMeta?.status === "archived"
                const isSoldOut = product.variants?.every((v: any) => (v.inventory_quantity ?? 0) <= 0)

                const breweryName = pMeta?.brewery_name || pMeta?.brewery || brewery.name
                const beerName = (() => {
                  const sep = (product.title || "").indexOf(" — ")
                  if (sep !== -1) return product.title.slice(sep + 3)
                  return product.title || ""
                })()

                return (
                  <div key={product.id} className={`group flex flex-col h-full ${isArchived ? "opacity-70 grayscale hover:grayscale-0 hover:opacity-100 transition-all" : ""}`}>
                    <Link href={`/products/${product.handle}`}>
                      <div className="aspect-square bg-hg-surface-dim rounded-xl overflow-hidden relative mb-4">
                        <Thumbnail
                          thumbnail={product.thumbnail}
                          images={product.images}
                          size="full"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <ProductPill product={product} />
                      </div>
                    </Link>
                    <div className="flex flex-col flex-grow">
                      <span className="text-[10px] text-hg-text-muted uppercase tracking-widest mb-1 font-semibold">
                        {breweryName}
                      </span>
                      <Link href={`/products/${product.handle}`}>
                        <h4 className="text-lg font-semibold text-hg-text group-hover:text-hl-primary transition-colors capitalize">
                          {beerName}
                        </h4>
                      </Link>
                      {canSeePricing && (style || abv) && (
                        <span className="text-sm text-hg-text-muted mb-4">
                          {style}{style && abv ? " • " : ""}{abv}
                        </span>
                      )}
                      {canSeePricing && (
                        <div className="mt-auto flex justify-between items-center pt-4 border-t border-hg-border/30">
                          {cheapestPrice ? (
                            <span className={`text-xl font-bold ${isArchived || isSoldOut ? "text-hg-text-muted" : "text-hg-text"}`}>
                              {cheapestPrice.calculated_price}
                            </span>
                          ) : (
                            <span />
                          )}
                          {isSoldOut || isArchived ? (
                            <span className="px-4 py-2 bg-hg-surface-dim text-hg-text-muted text-xs font-bold rounded-lg cursor-not-allowed">
                              Sold Out
                            </span>
                          ) : (
                            <Link
                              href={`/products/${product.handle}`}
                              className="px-4 py-2 bg-hl-primary text-white text-xs font-bold rounded-lg hover:opacity-90 transition-colors"
                            >
                              Add
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-hg-text-muted">No items currently available from this producer.</p>
          )}

          {/* Collaborations Section */}
          {collabs.length > 0 && (
            <div className="mt-16">
              <div className="flex justify-between items-end mb-10">
                <div>
                  <h2 className="text-h2 text-hg-text">Collaborations</h2>
                  <p className="text-hg-text-muted mt-2">Beers brewed in partnership with {brewery.name}.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-y-12 gap-x-6">
                {collabs.map((product: any) => {
                  const { cheapestPrice } = getProductPrice({ product })
                  return (
                    <div key={product.id} className="group flex flex-col h-full">
                      <Link href={`/products/${product.handle}`}>
                        <div className="aspect-square bg-hg-surface-dim rounded-xl overflow-hidden relative mb-4">
                          <Thumbnail
                            thumbnail={product.thumbnail}
                            images={[]}
                            size="full"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <ProductPill product={product} />
                        </div>
                      </Link>
                      <div className="flex flex-col flex-grow">
                        <span className="text-[10px] text-hg-text-muted uppercase tracking-widest mb-1 font-semibold">
                          {product.primary_brewery_name}
                        </span>
                        <Link href={`/products/${product.handle}`}>
                          <h4 className="text-lg font-semibold text-hg-text group-hover:text-hl-primary transition-colors capitalize">
                            {product.title}
                          </h4>
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Technical Mastery Banner */}
          <div className="mt-16 relative rounded-2xl overflow-hidden h-64 flex items-center p-12">
            <div
              className="absolute inset-0 bg-hl-primary/20"
              style={{ backdropFilter: "blur(2px)" }}
            />
            {brewery.hero_image_url && (
              <img
                className="absolute inset-0 w-full h-full object-cover opacity-40"
                src={brewery.hero_image_url}
                alt=""
              />
            )}
            <div className="absolute inset-0" style={{ background: "color-mix(in srgb, var(--color-primary) 20%, transparent)" }} />
            <div className="relative z-10 max-w-lg">
              <h3 className="text-h3 text-white mb-2">
                Technical Mastery
              </h3>
              <p className="text-white/80 text-base">
                Learn more about {brewery.name}&apos;s approach to craft brewing and their unique production methods.
              </p>
              <button className="mt-4 text-white font-bold underline decoration-hl-primary underline-offset-8 hover:text-hl-primary transition-colors">
                Read the Dossier
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
