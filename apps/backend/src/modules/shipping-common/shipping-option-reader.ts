import { Pool } from "pg"

/**
 * Fulfillment providers never receive the shipping option's `data` at
 * createFulfillment time (Medusa 2.17.2 passes only fulfillment.shipping_option_id),
 * and the provider container cannot resolve other modules. Read the option
 * row directly, like site-config/direct-reader.ts.
 */
export type ShippingOptionRecord = {
  id: string
  provider_id: string | null
  data: Record<string, unknown> | null
}

export type ShippingOptionReader = (id: string) => Promise<ShippingOptionRecord | null>

let pool: Pool | null = null

function getPool(): Pool | null {
  if (pool) return pool
  const url = process.env.DATABASE_URL
  if (!url || process.env.NODE_ENV === "test") return null
  pool = new Pool({ connectionString: url, max: 2, connectionTimeoutMillis: 3000 })
  pool.on("error", () => {})
  return pool
}

export const readShippingOptionDirect: ShippingOptionReader = async (id) => {
  const p = getPool()
  if (!p || !id) return null
  const res = await p.query(
    "select id, provider_id, data from shipping_option where id = $1 and deleted_at is null limit 1",
    [id]
  )
  return (res.rows[0] as ShippingOptionRecord | undefined) ?? null
}
