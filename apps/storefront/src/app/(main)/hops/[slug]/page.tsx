import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { sdk } from "@lib/config"
import { getRegion } from "@lib/data/regions"
import { getMembershipStatus, isApprovedMember } from "@lib/data/membership"
import { getProductPrice } from "@lib/util/get-product-price"
import Thumbnail from "@modules/products/components/thumbnail"

type Props = {
  params: Promise<{ slug: string }>
}

async function getHopBySlug(slug: string) {
  try {
    const data = await sdk.client.fetch<{ hop: any; products: any[] }>(`/store/hops/${slug}`, {
      method: "GET",
      next: { revalidate: 120 },
    })
    return data
  } catch {
    return null
  }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params
  const data = await getHopBySlug(slug)

  if (!data?.hop) {
    return { title: "Hop Not Found" }
  }

  return {
    title: `${data.hop.name} Hops | Hops & Glory`,
    description: data.hop.flavor_profile || `Releases featuring ${data.hop.name} in the Hops & Glory collection`,
  }
}

export default async function HopDetailPage(props: Props) {
  const { slug } = await props.params
  const data = await getHopBySlug(slug)

  if (!data?.hop) {
    notFound()
  }

  const { hop, products } = data
  const region = await getRegion("au")
  const membership = await getMembershipStatus()
  const approved = isApprovedMember(membership)

  return (
    <div className="content-container py-12">
      <div className="mb-12">
        <Link href="/store" className="text-sm text-hg-text-secondary hover:text-hg-accent transition-colors">
          ← Back to Collection
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
        <div className="md:col-span-2">
          <h1 className="text-h1 text-hg-text mb-4">{hop.name}</h1>
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
            <p className="text-hg-text-secondary leading-relaxed">{hop.description}</p>
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

      <div className="border-t border-hg-border pt-12">
        <h2 className="text-h2 text-hg-text mb-8">
          Releases featuring {hop.name}
          <span className="text-hg-text-secondary text-lg ml-3">({products.length})</span>
        </h2>

        {products.length === 0 ? (
          <p className="text-hg-text-secondary">No releases currently in stock with this ingredient.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product: any) => {
              const price = region && approved
                ? getProductPrice({ product })
                : null

              return (
                <Link
                  key={product.id}
                  href={`/products/${product.handle}`}
                  className="group"
                >
                  <Thumbnail
                    thumbnail={product.thumbnail}
                    images={product.images}
                    size="medium"
                  />
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
