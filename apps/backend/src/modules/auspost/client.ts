import {
  AusPostPacLikeClient,
  PacApiError,
  PacCalculateRequest,
  PacCalculateResponse,
  PacPostageResult,
  PacRateRequest,
  PacService,
  PacServiceResponse,
  PAC_BASE,
} from "./types"

/**
 * Live PAC HTTP client.
 *
 * - All requests are HTTP GET with query-string params.
 * - Auth header: AUTH-KEY: <api-key>.
 * - Responses are JSON; numeric fields like `price` come back as decimal-strings.
 * - Out-of-range dimensions/weight produce a 422 (or a 200 with an `error` body
 *   - both shapes exist in the wild). We surface either as PacApiError.
 */
export class AusPostPacClient implements AusPostPacLikeClient {
  private apiKey: string
  private base: string
  private fetchImpl: typeof fetch

  constructor(opts: { apiKey: string; base?: string; fetchImpl?: typeof fetch }) {
    if (!opts.apiKey) {
      throw new Error("AusPostPacClient requires an apiKey. Use the stub client when no key is configured.")
    }
    this.apiKey = opts.apiKey
    this.base = (opts.base ?? PAC_BASE).replace(/\/$/, "")
    this.fetchImpl = opts.fetchImpl ?? fetch
  }

  private buildQuery(params: Record<string, string | number | string[] | undefined>): string {
    const out = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue
      if (Array.isArray(v)) {
        for (const inner of v) out.append(k, String(inner))
      } else {
        out.append(k, String(v))
      }
    }
    return out.toString()
  }

  private async request<T>(path: string, params: Record<string, unknown>): Promise<T> {
    const query = this.buildQuery(params as Record<string, string | number | string[] | undefined>)
    const url = `${this.base}${path}${query ? `?${query}` : ""}`
    const res = await this.fetchImpl(url, {
      method: "GET",
      headers: { "AUTH-KEY": this.apiKey },
    })

    let parsed: unknown
    const text = await res.text()
    try {
      parsed = text ? JSON.parse(text) : undefined
    } catch {
      parsed = text
    }

    if (!res.ok) {
      const errMsg =
        (parsed as { error?: { errorMessage?: string } })?.error?.errorMessage ||
        `PAC ${path} failed (${res.status})`
      const errCode = (parsed as { error?: { errorCode?: string } })?.error?.errorCode
      throw new PacApiError(res.status, errMsg, { code: errCode })
    }

    // Some PAC errors return 200 with `error` payload instead of HTTP error.
    const inlineError = (parsed as { error?: { errorMessage?: string; errorCode?: string } })?.error
    if (inlineError?.errorMessage) {
      throw new PacApiError(200, inlineError.errorMessage, { code: inlineError.errorCode })
    }

    return parsed as T
  }

  async listServices(req: PacRateRequest): Promise<PacService[]> {
    const res = await this.request<PacServiceResponse>(
      "/postage/parcel/domestic/service.json",
      {
        from_postcode: req.fromPostcode,
        to_postcode: req.toPostcode,
        length: round1(req.lengthCm),
        width: round1(req.widthCm),
        height: round1(req.heightCm),
        weight: round3(req.weightKg),
      },
    )
    const raw = res.services?.service
    if (!raw) return []
    return Array.isArray(raw) ? raw : [raw]
  }

  async calculate(req: PacCalculateRequest): Promise<PacPostageResult> {
    const optionCodes = !req.optionCode
      ? undefined
      : Array.isArray(req.optionCode)
        ? req.optionCode
        : [req.optionCode]

    const res = await this.request<PacCalculateResponse>(
      "/postage/parcel/domestic/calculate.json",
      {
        from_postcode: req.fromPostcode,
        to_postcode: req.toPostcode,
        length: round1(req.lengthCm),
        width: round1(req.widthCm),
        height: round1(req.heightCm),
        weight: round3(req.weightKg),
        service_code: req.serviceCode,
        option_code: optionCodes,
        suboption_code: req.suboptionCode,
        extra_cover: req.extraCover,
      },
    )
    if (!res.postage_result) {
      throw new PacApiError(500, "PAC calculate returned no postage_result")
    }
    return res.postage_result
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000
}
