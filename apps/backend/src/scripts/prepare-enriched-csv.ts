import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import * as fs from "fs"
import * as path from "path"

const EXPORT_COLUMNS = [
  "name",
  "brewery",
  "style",
  "abv",
  "price",
  "stock",
  "container",
  "volume_ml",
  "description",
  "collab_breweries",
  "hops",
  "images",
  "release_at",
  "is_anniversary",
] as const

const csvEscape = (v: unknown): string => {
  const s = v == null ? "" : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export default async function prepareEnrichedCsv({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as any

  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "description",
      "metadata",
      "variants.prices.amount",
      "variants.prices.currency_code",
      "images.url",
      "hops.*",
    ],
    filters: { status: "published" } as any,
  })

  // Reverse traversal for beer_style
  const styleByProduct = new Map<string, string>()
  try {
    const { data: beerStyles } = await query.graph({
      entity: "beer_style",
      fields: ["name", "products.id"],
    })
    for (const s of beerStyles as any[]) {
      for (const p of s.products || []) {
        styleByProduct.set(p.id, s.name)
      }
    }
  } catch {}

  // Reverse traversal for breweries
  const breweriesByProduct = new Map<string, Array<{ name: string; slug: string }>>()
  try {
    const { data: breweries } = await query.graph({
      entity: "brewery",
      fields: ["name", "slug", "products.id"],
    })
    for (const b of breweries as any[]) {
      for (const p of b.products || []) {
        const arr = breweriesByProduct.get(p.id) || []
        arr.push({ name: b.name, slug: b.slug })
        breweriesByProduct.set(p.id, arr)
      }
    }
  } catch {}

  // Stock
  const stockByProduct = new Map<string, number>()
  try {
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["product_id", "inventory_items.inventory.location_levels.stocked_quantity"],
    })
    for (const v of variants as any[]) {
      let qty = 0
      for (const ii of v.inventory_items || []) {
        for (const ll of ii.inventory?.location_levels || []) {
          qty += Number(ll.stocked_quantity || 0)
        }
      }
      stockByProduct.set(v.product_id, (stockByProduct.get(v.product_id) || 0) + qty)
    }
  } catch {}

  const rows: string[] = [EXPORT_COLUMNS.join(",")]

  for (const p of products) {
    const md = ((p as any).metadata || {}) as Record<string, any>
    const primarySlug = md.brewery_slug
    const linked = breweriesByProduct.get(p.id) || []
    const collabs = linked.filter((b) => b.slug !== primarySlug).map((b) => b.name)

    let price: number | null = null
    for (const v of (p as any).variants || []) {
      for (const pr of v.prices || []) {
        if (pr.currency_code === "aud") {
          price = price == null ? Number(pr.amount) : Math.min(price, Number(pr.amount))
        }
      }
    }

    const linkedHopNames = ((p as any).hops || []).map((h: any) => h.name).filter(Boolean)
    const hops =
      linkedHopNames.length > 0
        ? linkedHopNames.join(",")
        : Array.isArray(md.hops)
          ? md.hops.join(",")
          : Array.isArray(md.hop_names)
            ? md.hop_names.join(",")
            : ""

    const style = styleByProduct.get(p.id) || md.beer_style || md.style || ""
    const images = ((p as any).images || []).map((i: any) => i.url).join(",")
    const stock = stockByProduct.get(p.id) ?? ""

    // Default container and volume for all current products (all cans)
    const container = md.container_type || md.container || "Can 440ml"
    const volume_ml = md.volume_ml ?? ""

    const record: Record<string, unknown> = {
      name: (p as any).title,
      brewery: md.brewery_name || linked.find((b) => b.slug === primarySlug)?.name || "",
      style,
      abv: md.abv ?? "",
      price: price ?? "",
      stock,
      container,
      volume_ml,
      description: (p as any).description ?? "",
      collab_breweries: collabs.join(","),
      hops,
      images,
      release_at: md.release_at || md.early_access_until || "",
      is_anniversary: typeof md.is_anniversary === "boolean" ? String(md.is_anniversary) : "",
    }

    rows.push(EXPORT_COLUMNS.map((c) => csvEscape(record[c])).join(","))
  }

  const csv = rows.join("\n")
  const outPath = path.join(process.cwd(), "data", "enriched-catalogue.csv")

  // Ensure data/ directory exists
  if (!fs.existsSync(path.join(process.cwd(), "data"))) {
    fs.mkdirSync(path.join(process.cwd(), "data"), { recursive: true })
  }
  fs.writeFileSync(outPath, csv, "utf-8")

  console.log(`\nExported ${products.length} products to: ${outPath}`)
  console.log("\nSample rows (first 5):")
  const lines = csv.split("\n")
  console.log(lines[0])
  lines.slice(1, 6).forEach((l) => console.log(l))
}
