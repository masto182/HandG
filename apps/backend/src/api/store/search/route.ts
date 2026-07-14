import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getMeiliClient, PRODUCTS_INDEX } from "../../../lib/meilisearch"
import { safeText } from "../../../lib/util/sanitize-text"

const sanitizeFilterValue = (val: string): string => val.replace(/"/g, '\\"')

const MAX_QUERY_LEN = 200
const MAX_LIMIT = 100
const MAX_OFFSET = 10000

// Only these attributes are configured sortable on the index (see
// lib/meilisearch.ts updateSortableAttributes). Validate the client-supplied
// sort against an allowlist so a malformed/unsortable value can't error the
// query or sort by an unintended attribute.
const DEFAULT_SORT = "created_at_ts:desc"
const SORTABLE_ATTRS = new Set(["created_at_ts", "abv", "title", "untappd_score"])
export function safeSort(raw: unknown): string {
  const s = String(raw ?? "")
  const [attr, dir] = s.split(":")
  if (SORTABLE_ATTRS.has(attr) && (dir === "asc" || dir === "desc")) {
    return `${attr}:${dir}`
  }
  return DEFAULT_SORT
}

function safeInt(raw: unknown, fallback: number, min: number, max: number): number {
  const n = parseInt(String(raw ?? ""), 10)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, n))
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const {
    q = "",
    brewery,
    style,
    hops,
    hopsMode = "or",
    hop_country,
    abv,
    freshness,
    collab,
    tags,
    available,
    sort = "created_at_ts:desc",
    limit = "20",
    offset = "0",
  } = req.query as Record<string, string>

  const meili = await getMeiliClient()
  const index = meili.index(PRODUCTS_INDEX)

  const filters: string[] = []

  if (brewery) {
    const list = (brewery as string).split(",").map((b) => `brewery = "${sanitizeFilterValue(b)}"`)
    filters.push(`(${list.join(" OR ")})`)
  }

  if (style) {
    const list = (style as string)
      .split(",")
      .map((s) => `style_family = "${sanitizeFilterValue(s)}"`)
    filters.push(`(${list.join(" OR ")})`)
  }

  if (hops) {
    const hopList = (hops as string).split(",")
    const joiner = hopsMode === "and" ? " AND " : " OR "
    const hopFilters = hopList.map((h) => `hops = "${sanitizeFilterValue(h)}"`)
    filters.push(`(${hopFilters.join(joiner)})`)
  }

  if (hop_country) {
    const countries = (hop_country as string)
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean)
    const cf = countries.map((c) => `hop_countries = "${sanitizeFilterValue(c)}"`)
    filters.push(`(${cf.join(" OR ")})`)
  }

  if (abv) {
    const ranges = (abv as string)
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean)
    const abvFilters = ranges
      .map((r) => {
        if (r.endsWith("+")) {
          const min = parseFloat(r)
          return Number.isFinite(min) ? `abv >= ${min}` : null
        }
        const [min, max] = r.split("-").map(Number)
        if (Number.isFinite(min) && Number.isFinite(max)) {
          return `(abv >= ${min} AND abv < ${max})`
        }
        return null
      })
      .filter(Boolean) as string[]
    if (abvFilters.length) {
      filters.push(`(${abvFilters.join(" OR ")})`)
    }
  }

  if (freshness) {
    const now = Date.now()
    const day = 86400000
    const ranges: Record<string, [number, number]> = {
      "0-30": [now - 30 * day, now],
      "31-60": [now - 60 * day, now - 30 * day],
      "61-90": [now - 90 * day, now - 60 * day],
      "91+": [0, now - 90 * day],
      "91-120": [now - 120 * day, now - 90 * day],
      "121+": [0, now - 120 * day],
    }
    const bands = (freshness as string).split(",")
    const bandFilters = bands
      .map((b) => ranges[b])
      .filter(Boolean)
      .map(([min, max]) => `(packaged_at_ts >= ${min} AND packaged_at_ts <= ${max})`)
    if (bandFilters.length) {
      filters.push(`(${bandFilters.join(" OR ")})`)
    }
  }

  if (collab === "1" || collab === "true") {
    filters.push("is_collab = true")
  }

  if (tags) {
    const tagList = (tags as string)
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    const tagFilters = tagList.map((t) => `tags = "${sanitizeFilterValue(t)}"`)
    filters.push(`(${tagFilters.join(" AND ")})`)
  }

  const parsedLimit = safeInt(limit, 20, 1, MAX_LIMIT)
  const parsedOffset = safeInt(offset, 0, 0, MAX_OFFSET)
  const safeQ = safeText(q, MAX_QUERY_LEN)

  try {
    const results = await index.search(safeQ, {
      filter: filters.length ? filters.join(" AND ") : undefined,
      sort: [safeSort(sort)],
      limit: parsedLimit,
      offset: parsedOffset,
      facets: ["brewery", "style", "style_family", "hops", "hop_countries"],
    })

    res.json({
      hits: results.hits,
      totalHits: results.estimatedTotalHits,
      facetDistribution: results.facetDistribution,
      query: safeQ,
    })
  } catch (error: any) {
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
    logger.error(`[search] MeiliSearch error: ${error.message}`)
    res.status(503).json({
      error: "Search temporarily unavailable",
    })
  }
}
