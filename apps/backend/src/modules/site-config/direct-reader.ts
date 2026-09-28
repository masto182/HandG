import { Pool } from "pg"
import { SITE_CONFIG_REGISTRY, coerceEnvValue } from "./registry"

const TTL_MS = 30_000

let pool: Pool | null = null
const cache = new Map<string, { value: unknown; at: number }>()

function getPool(): Pool | null {
  if (pool) return pool
  const url = process.env.DATABASE_URL
  if (!url || process.env.NODE_ENV === "test") return null
  pool = new Pool({ connectionString: url, max: 2, connectionTimeoutMillis: 3000 })
  pool.on("error", () => {})
  return pool
}

export async function readSiteConfigDirect(key: string): Promise<unknown> {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value

  const def = (SITE_CONFIG_REGISTRY as Record<string, any>)[key]
  let value: unknown = undefined

  const p = getPool()
  if (!p) return undefined
  {
    try {
      const res = await p.query(
        "select value from site_config where key = $1 and deleted_at is null limit 1",
        [key]
      )
      if (res.rows.length) value = res.rows[0].value
    } catch {
      return def?.default
    }
  }

  if (value === undefined && def?.envVar) {
    const raw = process.env[def.envVar]
    if (raw !== undefined && raw !== "") {
      const coerced = coerceEnvValue(def.type, raw)
      if (!def.validate || !def.validate(coerced)) value = coerced
    }
  }

  if (value === undefined) value = def?.default

  cache.set(key, { value, at: Date.now() })
  return value
}
