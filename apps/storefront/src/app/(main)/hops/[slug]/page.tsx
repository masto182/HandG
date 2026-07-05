import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { getHopBySlug } from "@lib/data/hops"
import { getMyHopAlert } from "@lib/data/hop-alerts"
import { getRegion } from "@lib/data/regions"
import { getMembershipStatus, isApprovedMember } from "@lib/data/membership"
import { getProductPrice } from "@lib/util/get-product-price"
import Thumbnail from "@modules/products/components/thumbnail"
import Icon from "@modules/common/components/icon"
import AlertHopButton from "@modules/hops/components/alert-hop-button"

type Props = {
  params: Promise<{ slug: string }>
}

const HOP_COUNTRY_LABELS: Record<string, string> = {
  NZ: "New Zealand",
  AU: "Australia",
  US: "United States",
  EU: "Europe",
  Other: "Other",
}

const HOP_FORM_META: Record<string, { label: string; description: string }> = {
  T90: {
    label: "T90 Pellets",
    description:
      "Standard hop pellet. 90% whole cone. The default form used in most beers.",
  },
  Cryo: {
    label: "Cryo",
    description:
      "YCH cryogenic lupulin separation pellet. ~2× the concentration of T90. Retains green hop character.",
  },
  CGX: {
    label: "CGX",
    description:
      "Crosby Hops cryogenic lupulin pellet. Direct equivalent of Cryo, focused on estate-grown varieties.",
  },
  Incognito: {
    label: "Incognito",
    description:
      "John I. Haas 100% hop liquid extract. Designed for hot-side (whirlpool) additions only.",
  },
  Spectrum: {
    label: "Spectrum",
    description:
      "BarthHaas 100% hop liquid extract. Designed for cold-side (dry hop) additions.",
  },
  HyperBoost: {
    label: "HyperBoost",
    description:
      "YCH CO₂ supercritical oil extract. Cold-side amplifier with the highest oil concentration of any extract.",
  },
  DynaBoost: {
    label: "DynaBoost",
    description:
      "YCH CO₂ supercritical oil extract standardised at 20% oil. Ideal for whirlpool additions.",
  },
  SubZeroHopKief: {
    label: "SubZero Hop Kief",
    description:
      "Freestyle Hops cryogenic solventless liquid. NZ varieties only. 275ml = 5kg of T90. Cold-side addition.",
  },
  HopKief: {
    label: "Hop Kief",
    description:
      "Freestyle Hops cold-side liquid extract for selected NZ varieties.",
  },
  LiquidLupulin: {
    label: "Liquid Lupulin",
    description:
      "Concentrated lupulin in liquid form. Pre-HyperBoost era product. Still used by some breweries.",
  },
  WholeCone: {
    label: "Whole Cone",
    description:
      "Dried intact hop cone. Traditional form, less common in modern craft brewing.",
  },
}

function HopFormChip({ form }: { form: string }) {
  const meta = HOP_FORM_META[form] || { label: form, description: "" }
  return (
    <span
      title={meta.description}
      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-hg-surface-raised border border-hg-border text-hg-text-secondary cursor-default"
    >
      {meta.label}
    </span>
  )
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params
  const data = await getHopBySlug(slug)

  if (!data?.hop) {
    return { title: "Hop Not Found" }
  }

  return {
    title: `${data.hop.name} Hops | Hops & Glory`,
    description:
      data.hop.flavor_profile ||
      `Releases featuring ${data.hop.name} in the Hops & Glory collection`,
  }
}

export default async function HopDetailPage(props: Props) {
  const { slug } = await props.params
  const data = await getHopBySlug(slug)

  if (!data?.hop) {
    notFound()
  }

  const { hop, products } = data
  const [region, membership, myAlert] = await Promise.all([
    getRegion("au"),
    getMembershipStatus(),
    getMyHopAlert(hop.id),
  ])
  const approved = isApprovedMember(membership)

  return (
    <div className="content-container py-8 small:py-12">
      <div className="mb-6 small:mb-12">
        <Link
          href="/store"
          className="text-sm text-hg-text-secondary hover:text-hg-accent transition-colors"
        >
          ← Back to Collection
        </Link>
      </div>

      <div className="grid grid-cols-1 small:grid-cols-3 gap-8 small:gap-12 mb-8 small:mb-16">
        <div className="md:col-span-2">
          <h1 className="text-h1 text-hg-text mb-4">{hop.name}</h1>

          {/* Country + Breeder */}
          {(hop.country_code || hop.breeder) && (
            <div className="flex items-center gap-3 mb-4">
              {hop.country_code && (
                <Link
                  href={`/hops?country=${hop.country_code}`}
                  className="px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-hg-surface-raised border border-hg-border text-hg-accent hover:border-hg-accent transition-colors"
                >
                  {HOP_COUNTRY_LABELS[hop.country_code] ?? hop.country_code}
                </Link>
              )}
              {hop.breeder && (
                <span className="text-xs text-hg-text-secondary">
                  by {hop.breeder}
                </span>
              )}
            </div>
          )}

          {hop.origin && (
            <p className="text-sm text-hg-accent font-medium uppercase tracking-wider mb-4">
              {hop.origin}
            </p>
          )}

          {hop.flavor_profile && (
            <div className="flex flex-wrap gap-2 mb-6">
              {hop.flavor_profile.split(",").map((flavor: string) => (
                <span
                  key={flavor.trim()}
                  className="px-3 py-1 rounded-full bg-hg-surface-raised text-hg-text-secondary text-sm border border-hg-border"
                >
                  {flavor.trim()}
                </span>
              ))}
            </div>
          )}

          {hop.description && (
            <p className="text-hg-text-secondary leading-relaxed mb-6">
              {hop.description}
            </p>
          )}

          {/* Available processing forms */}
          {hop.available_forms && hop.available_forms.length > 0 && (
            <section className="mb-8">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-hg-text-muted mb-3">
                Available Forms
              </h3>
              <div className="flex flex-wrap gap-2">
                {hop.available_forms.map((form: string) => (
                  <HopFormChip key={form} form={form} />
                ))}
              </div>
            </section>
          )}

          {/* Farm & sourcing notes */}
          {hop.farm_notes && (
            <section className="mb-8 p-4 rounded-lg border border-hg-border bg-hg-surface-raised">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-hg-text-muted mb-2">
                Farms & Sourcing
              </h3>
              <p className="text-sm text-hg-text-secondary leading-relaxed">
                {hop.farm_notes}
              </p>
            </section>
          )}

          {approved && (
            <div className="mt-2">
              <AlertHopButton
                hopId={hop.id}
                initialAlerted={!!myAlert}
                variant="full"
              />
            </div>
          )}
        </div>

        {hop.image_url && (
          <div className="flex items-start justify-center">
            <img
              src={hop.image_url}
              alt={hop.name}
              className="w-full max-w-[280px] rounded-xl object-cover"
            />
          </div>
        )}
      </div>

      <div className="border-t border-hg-border pt-8 small:pt-12">
        <h2 className="text-h2 text-hg-text mb-8">
          Releases featuring {hop.name}
          <span className="text-hg-text-secondary text-lg ml-3">
            ({products.length})
          </span>
        </h2>

        {products.length === 0 ? (
          <p className="text-hg-text-secondary">
            No releases currently in stock with this ingredient.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product: any) => {
              const price =
                region && approved ? getProductPrice({ product }) : null

              return (
                <Link
                  key={product.id}
                  href={`/products/${product.handle}`}
                  className="group"
                >
                  <div className="relative">
                    <Thumbnail
                      thumbnail={product.thumbnail}
                      images={product.images}
                      size="medium"
                    />
                    {!approved && (
                      <div className="absolute inset-0 bg-hg-surface/60 backdrop-blur-[4px] z-10 flex flex-col items-center justify-center gap-2 rounded-lg">
                        <Icon
                          name="lock"
                          size={28}
                          className="text-hg-text-secondary"
                        />
                        <span className="text-[11px] font-bold text-hg-text-secondary uppercase tracking-widest">
                          Members Only
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3">
                    <p className="text-xs text-hg-accent font-medium uppercase tracking-wider">
                      {(product.metadata as any)?.brewery_name || ""}
                    </p>
                    <p className="text-sm font-medium text-hg-text group-hover:text-hg-accent transition-colors mt-1">
                      {product.title}
                    </p>
                    {price?.cheapestPrice?.calculated_price && approved && (
                      <p className="text-sm text-hg-text-secondary mt-1">
                        {price.cheapestPrice.calculated_price}
                      </p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
