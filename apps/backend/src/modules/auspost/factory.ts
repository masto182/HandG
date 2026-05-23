import { AusPostPacClient } from "./client"
import { StubAusPostPacClient } from "./stub"
import type { AusPostPacLikeClient } from "./types"

let cached: AusPostPacLikeClient | null = null
let cachedKey = ""

/**
 * Returns a PAC client based on env / explicit options.
 *
 * When AUSPOST_API_KEY is empty (default for local dev / CI), returns a
 * stub client emitting deterministic AU rates per weight band.
 *
 * Cached per-process; resets when the key changes (useful for tests).
 */
export function getAusPostClient(opts?: {
  apiKey?: string
  base?: string
  fetchImpl?: typeof fetch
}): AusPostPacLikeClient {
  const key = opts?.apiKey ?? process.env.AUSPOST_API_KEY ?? ""
  if (cached && key === cachedKey) return cached

  if (!key) {
    cached = new StubAusPostPacClient()
    cachedKey = ""
    // eslint-disable-next-line no-console
    console.info("[auspost] no AUSPOST_API_KEY set; using stub PAC client")
  } else {
    cached = new AusPostPacClient({
      apiKey: key,
      base: opts?.base ?? process.env.AUSPOST_API_BASE,
      fetchImpl: opts?.fetchImpl,
    })
    cachedKey = key
    // eslint-disable-next-line no-console
    console.info("[auspost] live mode (digitalapi.auspost.com.au)")
  }

  return cached
}

export function resetAusPostClientCache() {
  cached = null
  cachedKey = ""
}
