import { ShipEngineClient } from "./client"
import { StubShipEngineClient } from "./stub"
import type { ShipEngineLikeClient } from "./types"

let cached: ShipEngineLikeClient | null = null
let cachedKey = ""

/**
 * Returns a ShipEngine client based on env. When SHIPENGINE_API_KEY is empty
 * (default for local dev / CI), returns a stub returning deterministic AU rates.
 *
 * Cached per-process; resets when env changes (useful for tests).
 */
export function getShipEngineClient(opts?: {
  apiKey?: string
  base?: string
  fetchImpl?: typeof fetch
}): ShipEngineLikeClient {
  const key = opts?.apiKey ?? process.env.SHIPENGINE_API_KEY ?? ""
  if (cached && key === cachedKey) return cached

  if (!key) {
    cached = new StubShipEngineClient()
    cachedKey = ""
    // eslint-disable-next-line no-console
    console.info("[shipengine] no SHIPENGINE_API_KEY set; using stub client (3 deterministic AU rates)")
  } else {
    cached = new ShipEngineClient({
      apiKey: key,
      base: opts?.base ?? process.env.SHIPENGINE_API_BASE,
      fetchImpl: opts?.fetchImpl,
    })
    cachedKey = key
    // eslint-disable-next-line no-console
    console.info("[shipengine] live mode (api.shipengine.com)")
  }

  return cached
}

export function resetShipEngineClientCache() {
  cached = null
  cachedKey = ""
}
