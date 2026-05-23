import type {
  AusPostPacLikeClient,
  PacCalculateRequest,
  PacCostLine,
  PacPostageResult,
  PacRateRequest,
  PacService,
} from "./types"

/**
 * Deterministic stub for local dev / CI / tests.
 *
 * Emits two services per request: AUS_PARCEL_REGULAR and AUS_PARCEL_EXPRESS,
 * with prices derived from the parcel weight + a small lane multiplier.
 *
 * Multi-parcel summing in mapping.ts is verified by the per-box price scaling
 * with weight: heavier boxes -> higher stub price.
 */
export class StubAusPostPacClient implements AusPostPacLikeClient {
  // eslint-disable-next-line @typescript-eslint/require-await
  async listServices(req: PacRateRequest): Promise<PacService[]> {
    const regular = this.priceForWeight(req.weightKg, "regular")
    const express = this.priceForWeight(req.weightKg, "express")
    return [
      {
        code: "AUS_PARCEL_REGULAR",
        name: "Parcel Post",
        price: regular.toFixed(2),
        max_extra_cover: 500,
      },
      {
        code: "AUS_PARCEL_EXPRESS",
        name: "Express Post",
        price: express.toFixed(2),
        max_extra_cover: 500,
      },
    ]
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async calculate(req: PacCalculateRequest): Promise<PacPostageResult> {
    const isExpress = req.serviceCode === "AUS_PARCEL_EXPRESS"
    const base = this.priceForWeight(req.weightKg, isExpress ? "express" : "regular")
    const optionCodes = !req.optionCode
      ? []
      : Array.isArray(req.optionCode)
        ? req.optionCode
        : [req.optionCode]
    const sodFee = optionCodes.includes("AUS_SERVICE_OPTION_SIGNATURE_ON_DELIVERY") ? 3.95 : 0
    const coverFee =
      optionCodes.includes("AUS_SERVICE_OPTION_EXTRA_COVER") && (req.extraCover ?? 0) > 0
        ? Math.max(1.5, Math.ceil((req.extraCover ?? 0) / 100) * 1.5)
        : 0

    const total = round2(base + sodFee + coverFee)
    const costs: PacCostLine[] = [
      { item: isExpress ? "Express Post" : "Parcel Post", cost: round2(base).toFixed(2) },
    ]
    if (sodFee > 0) costs.push({ item: "Signature on Delivery", cost: sodFee.toFixed(2) })
    if (coverFee > 0) costs.push({ item: "Extra cover", cost: coverFee.toFixed(2) })

    return {
      service: isExpress ? "Express Post" : "Parcel Post",
      delivery_time: isExpress ? "Delivered next business day" : "Delivered in 3-5 business days",
      total_cost: total.toFixed(2),
      costs: { cost: costs.length === 1 ? costs[0] : costs },
    }
  }

  private priceForWeight(weightKg: number, tier: "regular" | "express"): number {
    // Banded pricing similar to MyPost Business retail tiers
    const bands: Array<{ maxKg: number; reg: number; exp: number }> = [
      { maxKg: 0.5, reg: 8.95, exp: 12.95 },
      { maxKg: 1, reg: 10.5, exp: 14.95 },
      { maxKg: 3, reg: 13.4, exp: 18.65 },
      { maxKg: 5, reg: 17.85, exp: 24.95 },
      { maxKg: 10, reg: 24.5, exp: 32.95 },
      { maxKg: 22, reg: 36.5, exp: 49.95 },
    ]
    const w = Math.max(0.001, weightKg)
    const band = bands.find((b) => w <= b.maxKg) ?? bands[bands.length - 1]
    return tier === "regular" ? band.reg : band.exp
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
