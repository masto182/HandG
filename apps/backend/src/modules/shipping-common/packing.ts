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
 *   - Overflow (> 16 units) splits into multiple boxes.
 *   - Each box has a 200g tare weight added on top of contents.
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

export const CONTAINER_WEIGHTS: Record<ContainerType, number> = {
  can: 500,
  bottle: 600,
  crowler: 1200,
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
  return LARGE_BOX
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
      const totalWeight = batch.reduce((sum, u) => sum + u.weightG, 0) + BOX_TARE_G
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
