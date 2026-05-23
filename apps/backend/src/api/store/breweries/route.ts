import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const breweryService = req.scope.resolve("brewery") as any

  const breweries = await breweryService.listBreweries({
    is_active: true,
  })

  res.json({ breweries })
}
