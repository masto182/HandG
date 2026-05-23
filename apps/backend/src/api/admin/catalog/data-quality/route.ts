import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

type QualityIssue = {
  entity_id: string
  entity_type: "beer" | "brewery"
  title: string
  rule: string
  severity: "warning" | "error"
}

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const breweryService = req.scope.resolve("brewery") as any
  const beerDetailService = req.scope.resolve("beerDetail") as any

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "thumbnail", "images", "metadata", "description"],
  })

  const breweries = await breweryService.listBreweries({})
  const beerDetails = await beerDetailService.listBeerDetails({})
  const detailMap = new Map(beerDetails.map((d: any) => [d.product_id, d])) as Map<string, any>

  const issues: QualityIssue[] = []

  for (const product of products as any[]) {
    if (!product.thumbnail && (!product.images || product.images.length === 0)) {
      issues.push({
        entity_id: product.id,
        entity_type: "beer",
        title: product.title,
        rule: "missing_image",
        severity: "warning",
      })
    }

    const meta = product.metadata || {}
    if (!meta.abv && !product.description?.match(/[\d.]+%\s*ABV/)) {
      issues.push({
        entity_id: product.id,
        entity_type: "beer",
        title: product.title,
        rule: "missing_abv",
        severity: "warning",
      })
    }

    const detail = detailMap.get(product.id)
    if (!detail?.hop_provenance) {
      issues.push({
        entity_id: product.id,
        entity_type: "beer",
        title: product.title,
        rule: "missing_hops",
        severity: "warning",
      })
    }

    if (!detail?.untappd_bid && !detail?.untappd_rating) {
      issues.push({
        entity_id: product.id,
        entity_type: "beer",
        title: product.title,
        rule: "missing_untappd",
        severity: "warning",
      })
    }
  }

  for (const brewery of breweries) {
    if (!brewery.logo_url) {
      issues.push({
        entity_id: brewery.id,
        entity_type: "brewery",
        title: brewery.name,
        rule: "brewery_missing_logo",
        severity: "warning",
      })
    }
    if (!brewery.description) {
      issues.push({
        entity_id: brewery.id,
        entity_type: "brewery",
        title: brewery.name,
        rule: "brewery_missing_description",
        severity: "warning",
      })
    }
  }

  const byRule: Record<string, number> = {}
  for (const issue of issues) {
    byRule[issue.rule] = (byRule[issue.rule] || 0) + 1
  }

  res.json({
    summary: { total_issues: issues.length, by_rule: byRule },
    items: issues,
  })
}
