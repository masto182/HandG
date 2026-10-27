import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { productAccessForTier, type Tier } from "../../../lib/access/early-access"

/**
 * Authoritative early-access enforcement. The storefront hides the buy button
 * for locked products; this is the server-side backstop for any workaround.
 *
 * Covered routes:
 *   POST /store/carts/:id/line-items           (add: variant_id in body)
 *   POST /store/carts/:id/line-items/:line_id  (quantity change)
 *   POST /store/carts/:id/complete             (checkout: every line re-checked)
 *
 * Fails closed: an unparseable release date or a failed lookup returns 409.
 */

type LockedItem = {
  product_id: string | null
  title: string | null
  unlock_at: string | null
}

function reject(res: MedusaResponse, tier: Tier | null, items: LockedItem[]) {
  const unlockTimes = items
    .map((i) => i.unlock_at)
    .filter((t): t is string => Boolean(t))
    .sort()
  res.status(409).json({
    error: "access_not_yet_available",
    code: "access_not_yet_available",
    message:
      "This product hasn't unlocked for your tier yet. It can't be added or checked out until your access opens.",
    your_tier: tier,
    unlock_at: unlockTimes[unlockTimes.length - 1] ?? null,
    available_at: unlockTimes[unlockTimes.length - 1] ?? null,
    your_available_at: unlockTimes[unlockTimes.length - 1] ?? null,
    items,
  })
}

async function lockedForVariants(
  req: MedusaRequest,
  tier: Tier | null,
  variantIds: string[]
): Promise<LockedItem[]> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: variants } = await query.graph({
    entity: "variant",
    fields: ["id", "product.id", "product.title", "product.metadata"],
    filters: { id: variantIds },
  })
  const now = new Date()
  const locked: LockedItem[] = []
  for (const v of (variants as any[]) ?? []) {
    const access = productAccessForTier(v?.product?.metadata, tier, now)
    if (access.locked) {
      locked.push({
        product_id: v?.product?.id ?? null,
        title: v?.product?.title ?? null,
        unlock_at: access.unlockAt ? access.unlockAt.toISOString() : null,
      })
    }
  }
  return locked
}

async function cartLines(
  req: MedusaRequest,
  cartId: string
): Promise<Array<{ id: string; variant_id: string | null; quantity: number }>> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: carts } = await query.graph({
    entity: "cart",
    fields: ["id", "items.id", "items.variant_id", "items.quantity"],
    filters: { id: cartId },
  })
  return ((carts as any[])?.[0]?.items ?? []) as any[]
}

function cartPathIds(req: MedusaRequest): { cartId?: string; lineId?: string } {
  const p = (req.params || {}) as { id?: string; line_id?: string }
  const path = String((req as any).originalUrl ?? (req as any).url ?? req.path ?? "").split("?")[0]
  const m = /\/store\/carts\/([^/]+)\/(?:line-items(?:\/([^/]+))?|complete)\/?$/.exec(path)
  return { cartId: p.id ?? m?.[1], lineId: p.line_id ?? m?.[2] }
}

export async function enforceAccessOnCartAdd(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const tier = ((req as any).customer_tier as Tier | null) ?? null
  const body = (req.body || {}) as { variant_id?: string; quantity?: number }
  const params = cartPathIds(req)

  if (typeof body.quantity === "number" && body.quantity <= 0) return next()

  try {
    let variantIds: string[] = []
    if (body.variant_id) {
      variantIds = [body.variant_id]
    } else if (params.cartId && params.lineId) {
      const line = (await cartLines(req, params.cartId)).find((l) => l.id === params.lineId)
      if (!line) return next()
      if (typeof body.quantity === "number" && body.quantity <= line.quantity) return next()
      if (line.variant_id) variantIds = [line.variant_id]
    }
    if (variantIds.length === 0) return next()

    const locked = await lockedForVariants(req, tier, variantIds)
    if (locked.length > 0) return reject(res, tier, locked)
  } catch {
    return reject(res, tier, [{ product_id: null, title: null, unlock_at: null }])
  }

  return next()
}

export async function enforceAccessOnCartComplete(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const tier = ((req as any).customer_tier as Tier | null) ?? null
  const cartId = cartPathIds(req).cartId
  if (!cartId) return next()

  try {
    const variantIds = (await cartLines(req, cartId))
      .map((l) => l.variant_id)
      .filter((id): id is string => Boolean(id))
    if (variantIds.length === 0) return next()
    const locked = await lockedForVariants(req, tier, variantIds)
    if (locked.length > 0) return reject(res, tier, locked)
  } catch {
    return reject(res, tier, [{ product_id: null, title: null, unlock_at: null }])
  }

  return next()
}
