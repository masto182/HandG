import { Metadata } from "next"
import { notFound } from "next/navigation"
import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { getMembershipStatus, isApprovedMember } from "@lib/data/membership"
import { getEarlyAccessConfig } from "@lib/data/early-access"
import { getProductBeerStyle } from "@lib/data/beer-styles"
import { getBeerDetail } from "@lib/data/beer-detail"
import ProductTemplate from "@modules/products/templates"
import { HttpTypes } from "@medusajs/types"
import { buildProductJsonLd, serializeJsonLd } from "@lib/util/json-ld"

type Props = {
  params: Promise<{ handle: string }>
}

function getImagesForVariant(
  product: HttpTypes.StoreProduct,
  selectedVariantId?: string,
) {
  if (!selectedVariantId || !product.variants) {
    return product.images
  }

  const variant = product.variants!.find((v) => v.id === selectedVariantId)
  if (!variant || !variant.images?.length) {
    return product.images
  }

  const imageIdsMap = new Map(variant.images!.map((i) => [i.id, true]))
  return product.images?.filter((i) => imageIdsMap.has(i.id)) ?? null
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const { handle } = params

  const [region, product] = await Promise.all([
    getRegion("au"),
    listProducts({
      countryCode: "au",
      queryParams: { handle },
    }).then(({ response }) => response.products[0]),
  ])

  if (!region) {
    notFound()
  }

  if (!product) {
    notFound()
  }

  const meta = product.metadata as Record<string, any> | null
  const style = meta?.style as string | undefined
  const brewery = (meta?.brewery_name || meta?.brewery) as string | undefined

  const descriptor = [
    style,
    brewery ? (style ? `by ${brewery}` : brewery) : undefined,
  ]
    .filter(Boolean)
    .join(" ")

  const description = descriptor
    ? `${descriptor} — Hops & Glory`
    : `${product.title} — Hops & Glory`

  return {
    title: `${product.title} | Hops & Glory`,
    description,
    openGraph: {
      type: "website",
      title: `${product.title} | Hops & Glory`,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.title} | Hops & Glory`,
      description,
    },
  }
}

export default async function ProductPage(props: Props) {
  const params = await props.params

  // Independent fetches — run in parallel instead of waterfalling.
  // Wrap in try/catch: a backend error should render 404, not a 500 crash page.
  let region: Awaited<ReturnType<typeof getRegion>>
  let membershipStatus: Awaited<ReturnType<typeof getMembershipStatus>>
  let pricedProduct: HttpTypes.StoreProduct | undefined
  try {
    ;[region, membershipStatus, pricedProduct] = await Promise.all([
      getRegion("au"),
      getMembershipStatus(),
      listProducts({
        countryCode: "au",
        queryParams: { handle: params.handle },
      }).then(({ response }) => response.products[0]),
    ])
  } catch {
    notFound()
    return
  }

  if (!region) {
    notFound()
  }

  // Guard BEFORE touching the product (a bad handle must 404, not crash).
  if (!pricedProduct) {
    notFound()
  }

  const images = getImagesForVariant(pricedProduct)
  const isMember = isApprovedMember(membershipStatus)
  const isOutOfStock = pricedProduct.variants?.every(
    (v: any) => (v.inventory_quantity ?? 0) === 0,
  )

  // Secondary data — all independent of each other; fetch in parallel.
  const [
    existingRestockAlertId,
    buyAtPriceOffer,
    earlyAccess,
    beerStyle,
    beerDetail,
  ] = await Promise.all([
    (async (): Promise<string | null> => {
      if (isOutOfStock && isMember) {
        const { getMyRestockAlertForProduct } =
          await import("@lib/data/restock-alerts")
        const alert = await getMyRestockAlertForProduct(pricedProduct.id)
        return alert?.id ?? null
      }
      return null
    })(),
    (async (): Promise<{
      offerPrice: number
      currencyCode: string
      expiresAt: string | null
    } | null> => {
      if (isMember) {
        const { getCustomerOfferForProduct } =
          await import("@lib/data/wishlist-offers")
        const offer = await getCustomerOfferForProduct(pricedProduct.id)
        if (offer) {
          return {
            offerPrice: offer.offer_price,
            currencyCode: region.currency_code || "aud",
            expiresAt: offer.expires_at,
          }
        }
      }
      return null
    })(),
    getEarlyAccessConfig(),
    getProductBeerStyle(pricedProduct.id),
    getBeerDetail(pricedProduct.id),
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(buildProductJsonLd(pricedProduct as any)),
        }}
      />
      <ProductTemplate
        product={pricedProduct}
        region={region}
        countryCode="au"
        images={images ?? []}
        thumbnail={pricedProduct.thumbnail}
        canSeePricing={isApprovedMember(membershipStatus)}
        membershipStatus={membershipStatus}
        existingRestockAlertId={existingRestockAlertId}
        buyAtPriceOffer={buyAtPriceOffer}
        earlyAccessOffsets={earlyAccess.offsets}
        viewerTier={earlyAccess.viewerTier}
        beerStyle={beerStyle}
        hopProvenance={beerDetail?.hop_provenance ?? null}
      />
    </>
  )
}
