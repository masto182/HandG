import { listProducts } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"
import ProductActions from "@modules/products/components/product-actions"

export default async function ProductActionsWrapper({
  id,
  region,
  existingRestockAlertId,
}: {
  id: string
  region: HttpTypes.StoreRegion
  existingRestockAlertId?: string | null
}) {
  const product = await listProducts({
    queryParams: { id: [id] },
    regionId: region.id,
  }).then(({ response }) => response.products[0])

  if (!product) {
    return null
  }

  return <ProductActions product={product} region={region} existingRestockAlertId={existingRestockAlertId} />
}
