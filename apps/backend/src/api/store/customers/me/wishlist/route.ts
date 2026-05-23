import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { addWishlistWorkflow, removeWishlistByProductWorkflow } from "../../../../../workflows/manage-wishlist"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const wishlistService = req.scope.resolve("wishlist") as any

  const items = await wishlistService.listWishlists({
    customer_id: customerId,
  })

  if (items.length === 0) {
    return res.json({ wishlist: [] })
  }

  try {
    const productModule = req.scope.resolve(Modules.PRODUCT)
    const inventoryModule = req.scope.resolve(Modules.INVENTORY)
    const regionModule = req.scope.resolve(Modules.REGION)
    const pricingModule = req.scope.resolve(Modules.PRICING)
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    const productIds = [...new Set(items.map((i: any) => i.product_id))] as string[]

    const products = await productModule.listProducts(
      { id: productIds },
      {
        select: ["id", "title", "handle", "thumbnail", "metadata"],
        relations: ["variants"],
      }
    )

    let regions: any[] = []
    try {
      regions = await regionModule.listRegions({ currency_code: "aud" })
    } catch {
      regions = await regionModule.listRegions({})
    }
    const region = regions[0]

    const allVariantIds = products.flatMap((p: any) => (p.variants || []).map((v: any) => v.id))

    let priceMap = new Map<string, { amount: number; currency_code: string }>()
    if (region && allVariantIds.length > 0) {
      try {
        const { data: variantPriceLinks } = await query.graph({
          entity: "product_variant_price_set",
          filters: { variant_id: allVariantIds },
          fields: ["variant_id", "price_set_id"],
        })

        if (variantPriceLinks.length > 0) {
          const priceSetIds = variantPriceLinks.map((l: any) => l.price_set_id)
          const priceSets = await pricingModule.calculatePrices(
            { id: priceSetIds },
            {
              context: {
                region_id: region.id,
                currency_code: region.currency_code || "aud",
              },
            }
          )

          const priceSetToVariant = new Map<string, string>()
          for (const link of variantPriceLinks) {
            priceSetToVariant.set(link.price_set_id, link.variant_id)
          }

          for (const ps of priceSets) {
            const variantId = priceSetToVariant.get(ps.id)
            if (variantId && ps.calculated_amount != null) {
              priceMap.set(variantId, {
                amount: Number(ps.calculated_amount),
                currency_code: ps.currency_code || "aud",
              })
            }
          }
        }
      } catch (e) {
        const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
        logger.error("[Wishlist] Price calculation failed:", e)
      }
    }

    let inventoryMap = new Map<string, number>()
    if (allVariantIds.length > 0) {
      try {
        const { data: variantInventoryLinks } = await query.graph({
          entity: "product_variant_inventory_item",
          filters: { variant_id: allVariantIds },
          fields: ["variant_id", "inventory_item_id"],
        })

        const inventoryItemIds = variantInventoryLinks.map((l: any) => l.inventory_item_id)

        if (inventoryItemIds.length > 0) {
          const levels = await inventoryModule.listInventoryLevels(
            { inventory_item_id: inventoryItemIds },
            { select: ["inventory_item_id", "stocked_quantity", "reserved_quantity"] }
          )

          const itemToVariant = new Map<string, string>()
          for (const link of variantInventoryLinks) {
            itemToVariant.set(link.inventory_item_id, link.variant_id)
          }

          for (const level of levels) {
            const variantId = itemToVariant.get(level.inventory_item_id)
            if (variantId) {
              const available = (level.stocked_quantity ?? 0) - (level.reserved_quantity ?? 0)
              inventoryMap.set(variantId, (inventoryMap.get(variantId) || 0) + available)
            }
          }
        }
      } catch (e) {
        const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
        logger.error("[Wishlist] Inventory fetch failed:", e)
      }
    }

    const productMap = new Map<string, any>()
    for (const p of products) {
      let totalInventory = 0
      let cheapestPrice: number | null = null
      let currencyCode = region?.currency_code || "aud"
      let firstVariantId: string | null = null

      for (const v of (p as any).variants || []) {
        if (!firstVariantId) firstVariantId = v.id
        totalInventory += inventoryMap.get(v.id) || 0

        const price = priceMap.get(v.id)
        if (price && (cheapestPrice === null || price.amount < cheapestPrice)) {
          cheapestPrice = price.amount
          currencyCode = price.currency_code
        }
      }

      productMap.set(p.id, {
        id: p.id,
        title: (p as any).title,
        handle: (p as any).handle,
        thumbnail: (p as any).thumbnail,
        metadata: (p as any).metadata,
        first_variant_id: firstVariantId,
        total_inventory: totalInventory,
        cheapest_price: cheapestPrice,
        currency_code: currencyCode,
      })
    }

    const enriched = items.map((item: any) => ({
      ...item,
      product: productMap.get(item.product_id) || null,
    }))

    return res.json({ wishlist: enriched })
  } catch (e) {
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
    logger.error("[Wishlist GET] Enrichment failed, returning basic items:", e)
    return res.json({ wishlist: items.map((item: any) => ({ ...item, product: null })) })
  }
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const { product_id, mode, target_price, stock_threshold } = req.body as {
    product_id: string
    mode?: string
    target_price?: number
    stock_threshold?: number
  }

  const { result } = await addWishlistWorkflow(req.scope).run({
    input: {
      customer_id: customerId,
      product_id,
      mode,
      target_price: target_price ?? null,
      stock_threshold,
    },
  })

  res.status(201).json({ wishlist_item: result })
}

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const { product_id } = req.body as { product_id: string }

  await removeWishlistByProductWorkflow(req.scope).run({
    input: { customer_id: customerId, product_id },
  })

  res.json({ success: true })
}
