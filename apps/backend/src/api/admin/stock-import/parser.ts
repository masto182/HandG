import { parse as parseCsvSync } from "csv-parse/sync"

export type ParsedRow = {
  name: string
  brewery: string
  style: string
  abv: string
  price: string
  stock: string
  container?: string
  volume_ml?: string
  description?: string
  collab_breweries: string[]
  hops: string[]
  images: string[]
  release_at?: string
  is_anniversary?: boolean
  extras: Record<string, string>
  parseErrors: string[]
}

export const KNOWN_COLUMNS = new Set([
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
])

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export function splitMulti(value: string): string[] {
  if (!value) return []
  return value
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
}

export function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined || value === "") return undefined
  const v = value.trim().toLowerCase()
  if (["true", "1", "yes", "y"].includes(v)) return true
  if (["false", "0", "no", "n"].includes(v)) return false
  return undefined
}

export function parseStockImportCsv(text: string): ParsedRow[] {
  const records = parseCsvSync(text, {
    columns: (header: string[]) => header.map((h) => h.trim().toLowerCase()),
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as Record<string, string>[]

  const rows: ParsedRow[] = []
  for (const rec of records) {
    if (!rec.name || !rec.brewery) continue

    const parseErrors: string[] = []

    if (rec.abv && rec.abv !== "" && isNaN(parseFloat(rec.abv))) {
      parseErrors.push(`"${rec.name}": abv must be a number (got "${rec.abv}")`)
    }

    if (rec.price && rec.price !== "") {
      const p = parseFloat(rec.price)
      if (isNaN(p) || p < 0) {
        parseErrors.push(`"${rec.name}": price must be a non-negative number (got "${rec.price}")`)
      }
    }

    const extras: Record<string, string> = {}
    for (const [k, v] of Object.entries(rec)) {
      if (!KNOWN_COLUMNS.has(k) && v !== undefined && v !== "") {
        extras[k] = v
      }
    }

    rows.push({
      name: rec.name,
      brewery: rec.brewery,
      style: rec.style || "",
      abv: rec.abv || "",
      price: rec.price || "",
      stock: rec.stock || "",
      container: rec.container,
      volume_ml: rec.volume_ml && rec.volume_ml !== "" ? rec.volume_ml : undefined,
      description: rec.description && rec.description !== "" ? rec.description : undefined,
      collab_breweries: splitMulti(rec.collab_breweries || ""),
      hops: splitMulti(rec.hops || ""),
      images: splitMulti(rec.images || ""),
      release_at: rec.release_at && rec.release_at !== "" ? rec.release_at : undefined,
      is_anniversary: parseBoolean(rec.is_anniversary),
      extras,
      parseErrors,
    })
  }
  return rows
}
