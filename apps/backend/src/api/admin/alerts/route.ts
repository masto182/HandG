import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { ALERT_DISPATCH_MODULE } from "../../../modules/alert-dispatch"

export type DispatchRow = {
  id: string
  customer_id: string
  product_id: string
  kind: string
  email_sent: boolean
  clicked_at: string | null
  viewed_at: string | null
  carted_at: string | null
  ordered_at: string | null
  order_id: string | null
}

export type FunnelStats = {
  dispatched: number
  clicked: number
  click_rate: number
  viewed: number
  view_rate: number
  carted: number
  cart_rate: number
  ordered: number
  order_rate: number
  overall_rate: number
}

type KindBreakdown = {
  kind: string
  dispatched: number
  clicked: number
  carted: number
  ordered: number
  click_rate: number
  order_rate: number
}

export function computeFunnel(dispatches: DispatchRow[]): FunnelStats {
  const n = dispatches.length
  if (n === 0) {
    return {
      dispatched: 0,
      clicked: 0,
      click_rate: 0,
      viewed: 0,
      view_rate: 0,
      carted: 0,
      cart_rate: 0,
      ordered: 0,
      order_rate: 0,
      overall_rate: 0,
    }
  }
  const clicked = dispatches.filter((d) => d.clicked_at).length
  const viewed = dispatches.filter((d) => d.viewed_at).length
  const carted = dispatches.filter((d) => d.carted_at).length
  const ordered = dispatches.filter((d) => d.ordered_at).length
  const r = (num: number, den: number) => (den === 0 ? 0 : Math.round((num / den) * 1000) / 10)
  return {
    dispatched: n,
    clicked,
    click_rate: r(clicked, n),
    viewed,
    view_rate: r(viewed, n),
    carted,
    cart_rate: r(carted, clicked || 1),
    ordered,
    order_rate: r(ordered, carted || 1),
    overall_rate: r(ordered, n),
  }
}

export function computeByKind(dispatches: DispatchRow[]): KindBreakdown[] {
  const byKind = new Map<string, DispatchRow[]>()
  for (const d of dispatches) {
    const bucket = byKind.get(d.kind) ?? []
    bucket.push(d)
    byKind.set(d.kind, bucket)
  }
  const r = (num: number, den: number) => (den === 0 ? 0 : Math.round((num / den) * 1000) / 10)
  return [...byKind.entries()].map(([kind, rows]) => ({
    kind,
    dispatched: rows.length,
    clicked: rows.filter((d) => d.clicked_at).length,
    carted: rows.filter((d) => d.carted_at).length,
    ordered: rows.filter((d) => d.ordered_at).length,
    click_rate: r(rows.filter((d) => d.clicked_at).length, rows.length),
    order_rate: r(rows.filter((d) => d.ordered_at).length, rows.length),
  }))
}

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const dispatchService = req.scope.resolve(ALERT_DISPATCH_MODULE) as any
  const productModule = req.scope.resolve(Modules.PRODUCT) as any
  const orderModule = req.scope.resolve(Modules.ORDER) as any
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const dispatches: DispatchRow[] = await dispatchService.listAlertDispatches({})

  const funnel = computeFunnel(dispatches)
  const by_kind = computeByKind(dispatches)

  const orderedDispatches = dispatches.filter((d) => d.ordered_at && d.product_id)

  const productOrderCounts = new Map<string, number>()
  for (const d of orderedDispatches) {
    productOrderCounts.set(d.product_id, (productOrderCounts.get(d.product_id) ?? 0) + 1)
  }

  const topProductIds = [...productOrderCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id)

  let topProducts: Array<{ title: string; count: number }> = []
  if (topProductIds.length) {
    const products = await productModule.listProducts(
      { id: topProductIds },
      { select: ["id", "title"] }
    )
    topProducts = topProductIds.map((id) => ({
      title: products.find((p: any) => p.id === id)?.title ?? id,
      count: productOrderCounts.get(id) ?? 0,
    }))
  }

  let topBreweries: Array<{ name: string; count: number }> = []
  let topHops: Array<{ name: string; count: number }> = []

  if (topProductIds.length) {
    try {
      const { data: linked } = await query.graph({
        entity: "product",
        fields: ["id", "breweries.id", "breweries.name", "hops.id", "hops.name"],
        filters: { id: topProductIds },
      })
      const breweryOrderCounts = new Map<string, { name: string; count: number }>()
      const hopOrderCounts = new Map<string, { name: string; count: number }>()
      for (const p of linked as any[]) {
        const count = productOrderCounts.get(p.id) ?? 0
        for (const b of p.breweries ?? []) {
          const prev = breweryOrderCounts.get(b.id) ?? { name: b.name, count: 0 }
          breweryOrderCounts.set(b.id, { name: b.name, count: prev.count + count })
        }
        for (const h of p.hops ?? []) {
          const prev = hopOrderCounts.get(h.id) ?? { name: h.name, count: 0 }
          hopOrderCounts.set(h.id, { name: h.name, count: prev.count + count })
        }
      }
      topBreweries = [...breweryOrderCounts.values()].sort((a, b) => b.count - a.count).slice(0, 5)
      topHops = [...hopOrderCounts.values()].sort((a, b) => b.count - a.count).slice(0, 5)
    } catch {
      // linked lookup optional
    }
  }

  let attributed_revenue = 0
  const orderIds = [
    ...new Set(orderedDispatches.map((d) => d.order_id).filter(Boolean) as string[]),
  ]
  if (orderIds.length) {
    try {
      const orders = await orderModule.listOrders({ id: orderIds }, {
        select: ["id", "summary"],
      } as any)
      attributed_revenue = orders.reduce(
        (sum: number, o: any) => sum + (o.summary?.paid_total ?? 0),
        0
      )
    } catch {
      // revenue optional
    }
  }

  res.json({
    funnel,
    by_kind,
    top_products: topProducts,
    top_breweries: topBreweries,
    top_hops: topHops,
    attributed_revenue,
  })
}
