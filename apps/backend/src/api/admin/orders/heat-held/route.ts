import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

/**
 * GET /admin/orders/heat-held
 *
 * Returns orders that have unshipped items AND heat_hold_enabled is currently
 * true (so they would be blocked from dispatch). Used by the admin shipping
 * page banner.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  let siteConfig: { get(key: string): Promise<unknown> } | null = null
  try {
    siteConfig = req.scope.resolve("siteConfig") as { get(key: string): Promise<unknown> }
  } catch {
    /* fall back */
  }

  const heatHoldEnabled = siteConfig
    ? Boolean(await siteConfig.get("heat_hold_enabled").catch(() => false))
    : false

  if (!heatHoldEnabled) {
    res.json({ heat_hold_enabled: false, orders: [] })
    return
  }

  const orderModule = req.scope.resolve(Modules.ORDER)
  // Pull recent unfulfilled / partially fulfilled orders. v2's listOrders is
  // expressive but for this banner a simple recent list is enough.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orders = await (orderModule as any).listOrders(
    {
      status: ["pending", "completed"],
      fulfillment_status: ["not_fulfilled", "partially_fulfilled"],
    },
    { take: 100, relations: ["shipping_address"] },
  ).catch(() => [])

  const filtered = (Array.isArray(orders) ? orders : []).filter(
    (o: any) => !o?.metadata?.heat_hold_override,
  )

  res.json({
    heat_hold_enabled: true,
    orders: filtered.map((o: any) => ({
      id: o.id,
      display_id: o.display_id,
      created_at: o.created_at,
      total: o.total,
      shipping_address: o.shipping_address
        ? {
            city: o.shipping_address.city,
            state: o.shipping_address.province,
            postcode: o.shipping_address.postal_code,
          }
        : null,
    })),
  })
}
