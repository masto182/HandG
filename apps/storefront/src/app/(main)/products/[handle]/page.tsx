import { Metadata } from "next"
import { notFound } from "next/navigation"
import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { getMembershipStatus, isApprovedMember } from "@lib/data/membership"
import ProductTemplate from "@modules/products/templates"
import { HttpTypes } from "@medusajs/types"
import { buildProductJsonLd } from "@lib/util/json-ld"

type Props = {
  params: Promise<{ handle: string }>
}

function getImagesForVariant(
  product: HttpTypes.StoreProduct,
  selectedVariantId?: string
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
  const region = await getRegion("au")

  if (!region) {
    notFound()
  }

  const product = await listProducts({
    countryCode: "au",
    queryParams: { handle },
  }).then(({ response }) => response.products[0])

  if (!product) {
    notFound()
  }

  return {
    title: `${product.title} | Hops & Glory`,
    description: `${product.title} — from the Hops & Glory private collection`,
    openGraph: {
      title: `${product.title} | Hops & Glory`,
      description: `${product.title} — from the Hops & Glory private collection`,
      images: product.thumbnail ? [product.thumbnail] : [],
    },
  }
}

export default async function ProductPage(props: Props) {
  const params = await props.params
  const region = await getRegion("au")
  const membershipStatus = await getMembershipStatus()

  if (!region) {
    notFound()
  }

  const pricedProduct = await listProducts({
    countryCode: "au",
    queryParams: { handle: params.handle },
  }).then(({ response }) => response.products[0])

  const images = getImagesForVariant(pricedProduct)

  if (!pricedProduct) {
    notFound()
  }

  // Sprint 3: if product is OOS and the viewer is a member, look up any
  // existing restock alert so the button can render in subscribed state.
  const isOutOfStock = pricedProduct.variants?.every(
    (v: any) => (v.inventory_quantity ?? 0) === 0
  )
  let existingRestockAlertId: string | null = null
  if (isOutOfStock && isApprovedMember(membershipStatus)) {
    const { getMyRestockAlertForProduct } = await import("@lib/data/restock-alerts")
    const alert = await getMyRestockAlertForProduct(pricedProduct.id)
    existingRestockAlertId = alert?.id ?? null
  }

  let buyAtPriceOffer: {
    offerPrice: number
    currencyCode: string
    expiresAt: string | null
  } | null = null
  if (isApprovedMember(membershipStatus)) {
    const { getCustomerOfferForProduct } = await import("@lib/data/wishlist-offers")
    const offer = await getCustomerOfferForProduct(pricedProduct.id)
    if (offer) {
      buyAtPriceOffer = {
        offerPrice: offer.offer_price,
        currencyCode: region.currency_code || "aud",
        expiresAt: offer.expires_at,
      }
    }
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildProductJsonLd(pricedProduct as any)) }}
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
      />
    </>
  )
}
