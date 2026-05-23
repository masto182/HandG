import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getMeiliClient, PRODUCTS_INDEX } from "../../../lib/meilisearch"
import { safeText } from "../../../lib/util/sanitize-text"

const sanitizeFilterValue = (val: string): string => val.replace(/"/g, '\\"')

const MAX_QUERY_LEN = 200
const MAX_LIMIT = 100
const MAX_OFFSET = 10000

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
    freshness,
    collab,
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
    const list = (style as string).split(",").map((s) => `style = "${sanitizeFilterValue(s)}"`)
    filters.push(`(${list.join(" OR ")})`)
  }

  if (hops) {
    const hopList = (hops as string).split(",")
    const joiner = hopsMode === "and" ? " AND " : " OR "
    const hopFilters = hopList.map((h) => `hops = "${sanitizeFilterValue(h)}"`)
    filters.push(`(${hopFilters.join(joiner)})`)
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

  const parsedLimit = safeInt(limit, 20, 1, MAX_LIMIT)
  const parsedOffset = safeInt(offset, 0, 0, MAX_OFFSET)
  const safeQ = safeText(q, MAX_QUERY_LEN)

  try {
    const results = await index.search(safeQ, {
      filter: filters.length ? filters.join(" AND ") : undefined,
      sort: sort ? [sort as string] : ["created_at_ts:desc"],
      limit: parsedLimit,
      offset: parsedOffset,
      facets: ["brewery", "style", "hops"],
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
