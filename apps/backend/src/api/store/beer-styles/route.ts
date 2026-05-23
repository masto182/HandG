import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const beerStyleService = req.scope.resolve("beerStyle") as any

  const styles = await beerStyleService.listBeerStyles(
    {},
    { order: { family: "ASC", sort_order: "ASC" } }
  )

  const families = [...new Set(styles.map((s: any) => s.family))]

  res.json({ beer_styles: styles, families })
}
