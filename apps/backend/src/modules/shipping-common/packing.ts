/**
 * Shared shipping packing logic - small/medium/large boxes for cans/bottles/crowlers.
 *
 * Used by both shipengine and auspost fulfillment providers.
 *
 * Box dimensions are approximate measurements of real cartons used at the
 * Hops & Glory pack-out station. They are sent to carrier rate APIs as the
 * parcel dimensions, so accuracy directly impacts quote precision.
 *
 * Rules:
 *   - Any bottle or crowler in the order forces all boxes to Large.
 *   - Cans-only: pick smallest box that fits the count.
 *   - 17-32 cans go in one XL box (12in cube); overflow (> 32 cans) splits into multiple XL boxes.
 *   - Each box has a tare weight (box + packing) added on top of contents: 200g, or 500g for XL.
 */

export type ContainerType = "can" | "bottle" | "crowler"

export type PackableItem = {
  quantity: number
  weightG: number
  containerType: ContainerType
}

export type PackedBox = {
  weightG: number
  lengthCm: number
  widthCm: number
  heightCm: number
}

export const BOX_TARE_G = 200

export const SMALL_BOX = { lengthCm: 22, widthCm: 16, heightCm: 7, maxUnits: 2 }
export const MEDIUM_BOX = { lengthCm: 24, widthCm: 19, heightCm: 12, maxUnits: 6 }
export const LARGE_BOX = { lengthCm: 39, widthCm: 28, heightCm: 14, maxUnits: 16 }
export const XL_BOX = { lengthCm: 31, widthCm: 31, heightCm: 31, maxUnits: 32, tareG: 500 }

export const CONTAINER_WEIGHTS: Record<ContainerType, number> = {
  can: 550,
  bottle: 750,
  crowler: 1150,
}

export function resolveContainerType(formatOption?: string | null): ContainerType {
  if (!formatOption) return "can"
  const f = formatOption.toLowerCase()
  if (f.includes("bottle")) return "bottle"
  if (f.includes("crowler")) return "crowler"
  return "can"
}

function pickBoxForCans(count: number) {
  if (count <= SMALL_BOX.maxUnits) return SMALL_BOX
  if (count <= MEDIUM_BOX.maxUnits) return MEDIUM_BOX
  if (count <= LARGE_BOX.maxUnits) return LARGE_BOX
  return XL_BOX
}

export function packItems(items: PackableItem[]): PackedBox[] {
  if (!items.length) return []

  const units: { weightG: number; containerType: ContainerType }[] = []
  for (const item of items) {
    for (let i = 0; i < item.quantity; i++) {
      units.push({ weightG: item.weightG, containerType: item.containerType })
    }
  }

  if (!units.length) return []

  const hasLargeContainer = units.some(
    (u) => u.containerType === "bottle" || u.containerType === "crowler"
  )

  const boxes: PackedBox[] = []

  if (hasLargeContainer) {
    let remaining = [...units]
    while (remaining.length > 0) {
      const batch = remaining.slice(0, LARGE_BOX.maxUnits)
      remaining = remaining.slice(LARGE_BOX.maxUnits)
      const totalWeight = batch.reduce((sum, u) => sum + u.weightG, 0) + BOX_TARE_G
      boxes.push({
        weightG: totalWeight,
        lengthCm: LARGE_BOX.lengthCm,
        widthCm: LARGE_BOX.widthCm,
        heightCm: LARGE_BOX.heightCm,
      })
    }
  } else {
    let remaining = [...units]
    while (remaining.length > 0) {
      const box = pickBoxForCans(remaining.length)
      const batch = remaining.slice(0, box.maxUnits)
      remaining = remaining.slice(box.maxUnits)
      const tare = box === XL_BOX ? XL_BOX.tareG : BOX_TARE_G
      const totalWeight = batch.reduce((sum, u) => sum + u.weightG, 0) + tare
      boxes.push({
        weightG: totalWeight,
        lengthCm: box.lengthCm,
        widthCm: box.widthCm,
        heightCm: box.heightCm,
      })
    }
  }

  return boxes
}

/**
 * Generic line-item shape shared by CalculateShippingOptionPriceDTO context
 * items and FulfillmentItemDTO — both expose quantity plus optional
 * variant/product weight and variant options (for container-type format).
 */
export type PackableLineItem = {
  quantity?: number | string | null
  variant?: {
    weight?: number | null
    options?: Array<{ value?: string | null; option?: { title?: string | null } | null }> | null
  } | null
  product?: { weight?: number | null } | null
}

function containerTypeFromVariant(item: PackableLineItem): ContainerType {
  const formatOption = item.variant?.options?.find(
    (o) => o.option?.title?.toLowerCase() === "format"
  )
  return resolveContainerType(formatOption?.value)
}

/**
 * Build PackableItem[] from generic line items (fulfillment items or
 * calculate-price context items) so every ShipEngine path — rate quoting,
 * auto-requote, and the direct-buyLabel fallback — packs the *actual* order
 * contents instead of a single hardcoded box.
 */
export function packableItemsFromLineItems(
  items: PackableLineItem[] | undefined | null,
  defaultWeightG: number
): PackableItem[] {
  return (items ?? []).map((it) => {
    const containerType = containerTypeFromVariant(it)
    const quantity = typeof it.quantity === "number" ? it.quantity : Number(it.quantity ?? 1)
    const weightG =
      it.variant?.weight ?? it.product?.weight ?? CONTAINER_WEIGHTS[containerType] ?? defaultWeightG
    return { quantity, weightG, containerType }
  })
}

// ---------------------------------------------------------------------------
// SKU-based variant weight resolver
// ---------------------------------------------------------------------------

export type VariantWeightInfo = {
  weightG: number
  containerType: ContainerType
}

/**
 * Resolve variant weights by SKU via direct Postgres query.
 *
 * FulfillmentItemDTO has `sku` but no `variant.weight` or `variant.options`,
 * so the standard fallback chain defaults everything to 550g (can). This
 * function queries the real variant weight and Format option by SKU.
 *
 * Returns a Map keyed by SKU.  On any error returns an empty map so the
 * caller falls back to container-type defaults (degraded but non-fatal).
 */
export async function resolveWeightsBySku(skus: string[]): Promise<Map<string, VariantWeightInfo>> {
  const map = new Map<string, VariantWeightInfo>()
  if (!skus.length) return map

  const { Pool } = await import("pg")
  const url = process.env.DATABASE_URL
  if (!url || process.env.NODE_ENV === "test") return map

  let pool: import("pg").Pool | null = null
  try {
    pool = new Pool({ connectionString: url, max: 2, connectionTimeoutMillis: 3000 })
    pool.on("error", () => {})

    const placeholders = skus.map((_, i) => `$${i + 1}`).join(", ")
    const { rows } = await pool.query<{
      sku: string
      weight: number | null
      format_value: string | null
    }>(
      `SELECT pv.sku,
              pv.weight,
              pov.value AS format_value
       FROM product_variant pv
       LEFT JOIN product_option_value pov
         ON pov.variant_id = pv.id
       LEFT JOIN product_option po
         ON po.id = pov.option_id
         AND lower(po.title) = 'format'
       WHERE pv.sku IN (${placeholders})
         AND pv.deleted_at IS NULL`,
      skus
    )

    for (const row of rows) {
      const containerType = resolveContainerType(row.format_value)
      const weightG = row.weight ?? CONTAINER_WEIGHTS[containerType] ?? CONTAINER_WEIGHTS.can
      map.set(row.sku, { weightG, containerType })
    }
  } catch {
    // non-fatal — callers fall back to container-type defaults
  } finally {
    if (pool) await pool.end().catch(() => {})
  }

  return map
}

/**
 * Build PackableItem[] from FulfillmentItemDTO-shaped items (which only have
 * sku + quantity, not variant weight/options) by looking up real weights via
 * resolveWeightsBySku.
 */
export async function packableItemsFromFulfillmentItems(
  items: Array<{ sku?: string | null; quantity?: number | string | null }>,
  defaultWeightG: number
): Promise<PackableItem[]> {
  const skus = items.map((i) => i.sku).filter((s): s is string => !!s)
  const weightMap = await resolveWeightsBySku(skus)

  return items.map((it) => {
    const info = weightMap.get(it.sku ?? "")
    const containerType = info?.containerType ?? resolveContainerType(null)
    const weightG = info?.weightG ?? CONTAINER_WEIGHTS[containerType] ?? defaultWeightG
    const quantity = typeof it.quantity === "number" ? it.quantity : Number(it.quantity ?? 1)
    return { quantity, weightG, containerType }
  })
}
