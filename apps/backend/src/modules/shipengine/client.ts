import {
  ShipEngineApiError,
  ShipEngineBuyLabelInput,
  ShipEngineCarrier,
  ShipEngineGetRatesInput,
  ShipEngineLabel,
  ShipEngineLikeClient,
  ShipEngineRateResponse,
  ShipEngineTrackingInfo,
} from "./types"

const DEFAULT_BASE = "https://api.shipengine.com/v1"

export class ShipEngineClient implements ShipEngineLikeClient {
  private apiKey: string
  private base: string
  private fetchImpl: typeof fetch

  constructor(opts: { apiKey: string; base?: string; fetchImpl?: typeof fetch }) {
    if (!opts.apiKey) {
      throw new Error("ShipEngineClient requires an apiKey. Use the stub client when no key is configured.")
    }
    this.apiKey = opts.apiKey
    this.base = (opts.base ?? process.env.SHIPENGINE_API_BASE ?? DEFAULT_BASE).replace(/\/$/, "")
    this.fetchImpl = opts.fetchImpl ?? fetch
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.base}${path}`
    // sdk-exempt: ShipEngine REST API; not a Medusa SDK call.
    const res = await this.fetchImpl(url, {
      method,
      headers: {
        "API-Key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    let parsed: unknown = undefined
    const text = await res.text()
    if (text) {
      try {
        parsed = JSON.parse(text)
      } catch {
        parsed = text
      }
    }

    if (!res.ok) {
      const errors = (parsed as any)?.errors
      const first = Array.isArray(errors) ? errors[0] : undefined
      throw new ShipEngineApiError(res.status, first?.message ?? `ShipEngine ${method} ${path} failed (${res.status})`, {
        code: first?.error_code,
        request_id: (parsed as any)?.request_id,
        details: parsed,
      })
    }

    return parsed as T
  }

  async getRates(input: ShipEngineGetRatesInput): Promise<ShipEngineRateResponse> {
    return this.request<ShipEngineRateResponse>("POST", "/rates", input)
  }

  async buyLabelFromRate(
    rateId: string,
    opts?: { label_format?: string; label_layout?: string },
  ): Promise<ShipEngineLabel> {
    return this.request<ShipEngineLabel>("POST", `/labels/rates/${encodeURIComponent(rateId)}`, opts ?? {})
  }

  async buyLabel(input: ShipEngineBuyLabelInput): Promise<ShipEngineLabel> {
    return this.request<ShipEngineLabel>("POST", "/labels", input)
  }

  async voidLabel(labelId: string): Promise<{ approved: boolean; message?: string }> {
    try {
      return await this.request<{ approved: boolean; message?: string }>(
        "PUT",
        `/labels/${encodeURIComponent(labelId)}/void`,
      )
    } catch (err) {
      if (err instanceof ShipEngineApiError && err.status === 404) {
        return { approved: true, message: "label not found (already voided)" }
      }
      throw err
    }
  }

  async trackByLabel(labelId: string): Promise<ShipEngineTrackingInfo> {
    return this.request<ShipEngineTrackingInfo>("GET", `/labels/${encodeURIComponent(labelId)}/track`)
  }

  async listCarriers(): Promise<ShipEngineCarrier[]> {
    const res = await this.request<{ carriers: ShipEngineCarrier[] }>("GET", "/carriers")
    return res?.carriers ?? []
  }
}
