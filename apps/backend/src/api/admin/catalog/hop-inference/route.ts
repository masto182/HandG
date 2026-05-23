import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const beerDetailService = req.scope.resolve("beerDetail") as any

  const allDetails = await beerDetailService.listBeerDetails({})
  const pending = allDetails.filter(
    (d: any) => d.enrichment_status === "rule_inferred" || d.enrichment_status === "llm_inferred"
  )

  const queue = pending.map((d: any) => ({
    id: d.id,
    product_id: d.product_id,
    inferred_hops: d.hop_provenance,
    source: d.enrichment_status === "llm_inferred" ? "llm" : "rules",
    status: "pending",
  }))

  res.json({ queue, count: queue.length })
}
