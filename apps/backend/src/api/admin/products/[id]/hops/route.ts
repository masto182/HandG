import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  linkProductHopsWorkflow,
  unlinkProductHopsWorkflow,
} from "../../../../../workflows/manage-product-hop-link"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { id } = req.params

  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "hops.*"],
    filters: { id },
  })

  const product = (data as any[])?.[0]
  res.json({ hops: product?.hops || [] })
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const { hop_ids } = req.body as { hop_ids: string[] }

  if (!hop_ids?.length) {
    res.status(400).json({ error: "hop_ids array is required" })
    return
  }

  const { result } = await linkProductHopsWorkflow(req.scope).run({
    input: { product_id: id, hop_ids },
  })

  res.json({ success: true, linked: result.linked })
}

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const { hop_ids } = req.body as { hop_ids: string[] }

  if (!hop_ids?.length) {
    res.status(400).json({ error: "hop_ids array is required" })
    return
  }

  const { result } = await unlinkProductHopsWorkflow(req.scope).run({
    input: { product_id: id, hop_ids },
  })

  res.json({ success: true, unlinked: result.unlinked })
}
