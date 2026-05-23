import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { slug } = req.params
  const breweryService = req.scope.resolve("brewery") as any

  const breweries = await breweryService.listBreweries({ slug })

  if (!breweries.length) {
    return res.status(404).json({ message: "Brewery not found" })
  }

  res.json({ brewery: breweries[0] })
}
