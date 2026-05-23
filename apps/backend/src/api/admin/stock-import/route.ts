import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"

type CsvRow = {
  name: string
  brewery: string
  style: string
  abv: string
  price: string
  stock: string
  container?: string
  comment?: string
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split("\n")
  if (lines.length < 2) return []

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())
  const rows: CsvRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim())
    const row: any = {}
    headers.forEach((h, idx) => {
      row[h] = values[idx] || ""
    })
    if (row.name && row.brewery) {
      rows.push(row)
    }
  }

  return rows
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const productModule = req.scope.resolve(Modules.PRODUCT) as any
  const breweryService = req.scope.resolve("brewery") as any
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)

  const { csv } = req.body as { csv: string }

  if (!csv) {
    return res.status(400).json({ message: "CSV data required" })
  }

  if (csv.length > 500000) {
    return res.status(400).json({ message: "CSV too large (max 500KB)" })
  }

  const rows = parseCsv(csv)
  if (!rows.length) {
    return res.status(400).json({ message: "No valid rows found in CSV" })
  }

  if (rows.length > 500) {
    return res.status(400).json({ message: "Too many rows (max 500)" })
  }

  const breweries = await breweryService.listBreweries({})
  const breweryMap = new Map(breweries.map((b: any) => [b.name.toLowerCase(), b])) as Map<string, any>

  const salesChannels = await req.scope.resolve(Modules.SALES_CHANNEL).listSalesChannels({})
  const defaultChannel = salesChannels[0]

  let created = 0
  let updated = 0
  let errors: string[] = []

  for (const row of rows) {
    try {
      const brewery = breweryMap.get(row.brewery.toLowerCase())
      if (!brewery) {
        errors.push(`Row "${row.name}": brewery "${row.brewery}" not found`)
        continue
      }

      const existingProducts = await productModule.listProducts({
        title: row.name,
      })
      const existing = existingProducts.find(
        (p: any) => p.title === row.name && p.status === "published"
      )

      if (existing) {
        const variant = existing.variants?.[0]
        if (variant) {
          await productModule.updateProductVariants(variant.id, {
            prices: [{ currency_code: "aud", amount: parseFloat(row.price) || 0 }],
          })
        }
        await productModule.updateProducts(existing.id, {
          description: `${row.style} — ${row.abv}% ABV. Brewed by ${brewery.name}`,
          metadata: {
            ...existing.metadata,
            brewery_name: brewery.name,
            brewery_slug: brewery.slug,
            style: row.style,
            abv: row.abv,
            container: row.container || "Can 440ml",
          },
        })
        updated++
      } else {
        const handle = `${brewery.slug}-${row.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`

        const { result: products } = await createProductsWorkflow(req.scope).run({
          input: {
            products: [
              {
                title: row.name,
                handle,
                description: `${row.style} — ${row.abv}% ABV. Brewed by ${brewery.name}`,
                status: ProductStatus.PUBLISHED,
                metadata: {
                  brewery_name: brewery.name,
                  brewery_slug: brewery.slug,
                  style: row.style,
                  abv: row.abv,
                  container: row.container || "Can 440ml",
                  early_access_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                },
                options: [{ title: "Size", values: [row.container || "Can 440ml"] }],
                variants: [
                  {
                    title: `${row.name} — ${row.container || "Can 440ml"}`,
                    sku: handle,
                    manage_inventory: true,
                    prices: [{ currency_code: "aud", amount: parseFloat(row.price) || 0 }],
                    options: { Size: row.container || "Can 440ml" },
                  },
                ],
                sales_channels: defaultChannel ? [{ id: defaultChannel.id }] : [],
              },
            ],
          },
        })

        if (products[0]) {
          await link.create({
            brewery: { brewery_id: brewery.id },
            [Modules.PRODUCT]: { product_id: products[0].id },
          })
        }

        created++
      }
    } catch (err: any) {
      errors.push(`Row "${row.name}": ${err.message}`)
    }
  }

  logger.info(
    `[CSV Import] ${created} created, ${updated} updated, ${errors.length} errors`
  )

  res.json({
    created,
    updated,
    errors,
    total: rows.length,
  })
}
