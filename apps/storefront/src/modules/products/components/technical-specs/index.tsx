import { HttpTypes } from "@medusajs/types"
import Link from "next/link"

type TechnicalSpecsProps = {
  product: HttpTypes.StoreProduct
  canSeePricing?: boolean
}

const TechnicalSpecs = ({ product, canSeePricing = true }: TechnicalSpecsProps) => {
  const metadata = product.metadata as Record<string, any> | null
  const abv = metadata?.abv
  const style = metadata?.style
  const origin = metadata?.origin
  const volumeMl = metadata?.volume_ml as number | null | undefined
  const containerType = metadata?.container_type as string | null | undefined
  const hops = metadata?.hops as string[] | undefined

  const specs: { label: string; value: string }[] = []
  if (style && canSeePricing) specs.push({ label: "Style", value: style })
  if (abv && canSeePricing) specs.push({ label: "ABV", value: `${abv}%` })
  if (volumeMl && canSeePricing) specs.push({ label: "Volume", value: `${volumeMl}ml` })
  if (containerType && canSeePricing) specs.push({ label: "Format", value: containerType.charAt(0).toUpperCase() + containerType.slice(1) })
  if (origin) specs.push({ label: "Origin", value: origin })

  if (specs.length === 0 && (!hops || hops.length === 0)) return null

  const padded = specs.length % 2 !== 0 ? [...specs, { label: "", value: "" }] : specs

  return (
    <div>
      <h3 className="text-h3 text-hg-text mb-4 border-b border-hg-border pb-2">
        Technical Specs
      </h3>
      {padded.length > 0 && (
        <div className="grid grid-cols-2 gap-px bg-hg-border/20 rounded-xl overflow-hidden border border-hg-border/20 mb-4">
          {padded.map((spec, i) => (
            <div key={i} className="bg-hg-surface p-4 flex flex-col gap-1">
              {spec.label && (
                <>
                  <span className="font-semibold text-[10px] text-hg-text-secondary uppercase tracking-[0.05em]">
                    {spec.label}
                  </span>
                  <span className="font-semibold text-[16px] text-hg-text">
                    {spec.value}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      {canSeePricing && hops && hops.length > 0 && (
        <div>
          <span className="font-semibold text-[10px] text-hg-text-secondary uppercase tracking-[0.05em] block mb-2">
            Hops
          </span>
          <div className="flex flex-wrap gap-2">
            {hops.map((hop) => {
              const slug = hop.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
              return (
                <Link
                  key={hop}
                  href={`/hops/${slug}`}
                  className="px-3 py-1.5 rounded-full bg-hg-surface-raised border border-hg-border text-sm text-hg-text hover:border-hg-accent hover:text-hg-accent transition-colors"
                >
                  {hop}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default TechnicalSpecs
