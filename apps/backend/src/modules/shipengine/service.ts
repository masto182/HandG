import { AbstractFulfillmentProviderService, MedusaError } from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/framework/types"
import type {
  CalculatedShippingOptionPrice,
  CalculateShippingOptionPriceDTO,
  CreateFulfillmentResult,
  CreateShippingOptionDTO,
  FulfillmentDTO,
  FulfillmentItemDTO,
  FulfillmentOption,
  FulfillmentOrderDTO,
} from "@medusajs/framework/types"

import { getShipEngineClient } from "./factory"
import {
  CurrencyMismatchError,
  cartToShipEngineShipment,
  rateToShippingOption,
  type FromAddressConfig,
} from "./mapping"
import {
  ShipEngineApiError,
  type ShipEngineLikeClient,
  type ShipEngineRate,
  type ShipEngineRateResponse,
} from "./types"

type InjectedDependencies = {
  logger: Logger
}

type ProviderOptions = {
  api_key?: string
  api_base?: string
  carrier_ids?: string[]
  default_weight_g?: number
  from_name?: string
  from_phone?: string
  from_address_1?: string
  from_city?: string
  from_state?: string
  from_postcode?: string
  from_country?: string
  heat_hold_enabled?: boolean
  auto_pick_cheapest_label?: boolean
  shipping_validate_address_mode?: "no_validation" | "validate_only" | "validate_and_clean"
  shipping_default_item_weight_g?: number
}

const RATE_CACHE_TTL_MS = 14 * 60 * 1000 // 14 min, just under ShipEngine's 15-min quote TTL

const HEAT_HOLD_BLOCKED_CODE = "HEAT_HOLD_BLOCKED"

/**
 * ShipEngine fulfillment provider.
 *
 * - calculatePrice: returns cached rate (when fresh) or re-quotes /v1/rates.
 * - createFulfillment: enforces heat hold, optionally re-picks cheapest live
 *   carrier (auto_pick_cheapest_label SiteConfig), buys label via rate_id with
 *   fallback to direct buyLabel.
 * - cancelFulfillment: voids the label (tolerates 404).
 */
class ShipEngineProviderService extends AbstractFulfillmentProviderService {
  static identifier = "shipengine"

  protected readonly logger_: Logger
  protected readonly options_: ProviderOptions
  protected readonly client_: ShipEngineLikeClient
  protected readonly siteConfigResolver_: ((name: string) => unknown) | null

  constructor(deps: Record<string, unknown>, options: ProviderOptions = {}) {
    super()
    this.logger_ = (deps.logger ?? console) as Logger
    this.options_ = options
    this.client_ = getShipEngineClient({
      apiKey: options.api_key ?? process.env.SHIPENGINE_API_KEY,
      base: options.api_base,
    })
    // Optional DI resolver (used by unit tests + future scoped-container paths).
    // In Medusa 2.x production runs the fulfillment provider scope does not
    // expose `siteConfig`, so this is best-effort.
    this.siteConfigResolver_ =
      typeof (deps as { resolve?: unknown }).resolve === "function"
        ? ((deps as { resolve: (name: string) => unknown }).resolve)
        : null
  }

  // ---------- helpers ----------

  private async siteConfigGet<T>(key: string, fallback: T): Promise<T> {
    // Resolution order:
    //   1. Explicit provider options from medusa-config.ts
    //   2. SiteConfig service when reachable (DI), e.g. from unit tests
    //   3. Static fallback
    const fromOptions = (this.options_ as Record<string, unknown>)[key]
    if (fromOptions !== undefined) {
      return fromOptions as T
    }
    if (this.siteConfigResolver_) {
      try {
        const svc = this.siteConfigResolver_("siteConfig") as
          | { get?: (k: string) => Promise<unknown> | unknown }
          | undefined
        if (svc && typeof svc.get === "function") {
          const v = await svc.get(key)
          if (v !== undefined) return v as T
        }
      } catch {
        // resolver may throw for missing services; ignore and fall through
      }
    }
    return fallback
  }

  private async resolveFromAddress(): Promise<FromAddressConfig> {
    return {
      shipping_from_name: this.options_.from_name ?? "Hops & Glory",
      shipping_from_phone: this.options_.from_phone ?? "+61 0 0000 0000",
      shipping_from_address_1: this.options_.from_address_1 ?? "1 Hillside Lane",
      shipping_from_city: this.options_.from_city ?? "Hillside",
      shipping_from_state: this.options_.from_state ?? "VIC",
      shipping_from_postcode: this.options_.from_postcode ?? "3037",
      shipping_from_country: this.options_.from_country ?? "AU",
    }
  }

  private isRateCacheFresh(quotedAtIso: string | undefined | null): boolean {
    if (!quotedAtIso) return false
    const t = Date.parse(quotedAtIso)
    if (!Number.isFinite(t)) return false
    return Date.now() - t < RATE_CACHE_TTL_MS
  }

  private pickCheapestRate(rates: ShipEngineRate[]): ShipEngineRate | undefined {
    if (!rates.length) return undefined
    return [...rates].sort(
      (a, b) =>
        (a.shipping_amount?.amount ?? Number.POSITIVE_INFINITY) -
        (b.shipping_amount?.amount ?? Number.POSITIVE_INFINITY),
    )[0]
  }

  private async fetchRates(args: {
    shippingAddress: NonNullable<CalculateShippingOptionPriceDTO["context"]["shipping_address"]>
    items: CalculateShippingOptionPriceDTO["context"]["items"] | undefined
    currency: string
  }): Promise<ShipEngineRate[]> {
    const fromAddress = await this.resolveFromAddress()
    const carrierIds = this.options_.carrier_ids ?? []
    const defaultWeight = this.options_.default_weight_g ?? 750
    const validateMode = "validate_and_clean" as const

    if (!carrierIds.length) {
      this.logger_.warn("[shipengine] No carrier_ids configured; cannot fetch rates")
      return []
    }

    const body = cartToShipEngineShipment({
      shippingAddress: args.shippingAddress,
      packages: [{ weightG: defaultWeight, lengthCm: 24, widthCm: 19, heightCm: 12 }],
      fromAddress,
      carrierIds,
      validateMode,
    })

    this.logger_.info(`[shipengine] getRates request: ${JSON.stringify(body).slice(0, 1000)}`)
    const response = (await this.client_.getRates(body)) as ShipEngineRateResponse
    this.logger_.info(`[shipengine] getRates response: ${(response?.rate_response?.rates ?? []).length} rates, errors: ${JSON.stringify(response?.rate_response?.errors ?? []).slice(0, 1000)}, invalid_rates: ${JSON.stringify((response?.rate_response?.invalid_rates ?? []).map(r => ({carrier_code: r.carrier_code, error_messages: r.error_messages}))).slice(0, 1000)}`)
    return response?.rate_response?.rates ?? []
  }

  // ---------- AbstractFulfillmentProviderService overrides ----------

  // eslint-disable-next-line @typescript-eslint/require-await
  async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    return [
      {
        id: "shipengine-dynamic",
        name: "Live carrier rates (ShipEngine)",
        is_return: false,
      },
    ]
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async validateFulfillmentData(
    _optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    _context: unknown,
  ): Promise<Record<string, unknown>> {
    const hasRateId = typeof data?.rate_id === "string" && (data.rate_id as string).length > 0
    const hasCarrierAndService =
      typeof data?.carrier_id === "string" &&
      (data.carrier_id as string).length > 0 &&
      typeof data?.service_code === "string" &&
      (data.service_code as string).length > 0
    if (!hasRateId && !hasCarrierAndService) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "ShipEngine shipping method requires `rate_id` or both `carrier_id` and `service_code`.",
      )
    }
    return data
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async validateOption(_data: Record<string, unknown>): Promise<boolean> {
    return true
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async canCalculate(_data: CreateShippingOptionDTO): Promise<boolean> {
    return true
  }

  async calculatePrice(
    _optionData: CalculateShippingOptionPriceDTO["optionData"],
    data: CalculateShippingOptionPriceDTO["data"],
    context: CalculateShippingOptionPriceDTO["context"],
  ): Promise<CalculatedShippingOptionPrice> {
    // Provider-side amounts are in cents (matches CarrierRate.amount on the
    // rate-quote network type); Medusa stores cart money in major units, so
    // divide here at the boundary.
    const toMajor = (cents: number) => cents / 100
    try {
    const cachedAmount = typeof data?.amount === "number" ? (data.amount as number) : undefined
    if (cachedAmount !== undefined && this.isRateCacheFresh(data?.rate_quoted_at as string | undefined)) {
      return { calculated_amount: toMajor(cachedAmount), is_calculated_price_tax_inclusive: false }
    }

    if (!context?.shipping_address) {
      return {
        calculated_amount: toMajor(cachedAmount ?? 0),
        is_calculated_price_tax_inclusive: false,
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currency = ((context as any).currency_code ?? "aud").toLowerCase()
    let rates: ShipEngineRate[] = []
    try {
      rates = await this.fetchRates({
        shippingAddress: context.shipping_address,
        items: context.items,
        currency,
      })
    } catch (err) {
      this.logger_.warn(`[shipengine] calculatePrice: getRates failed: ${(err as Error).message}`)
      return {
        calculated_amount: toMajor(cachedAmount ?? 0),
        is_calculated_price_tax_inclusive: false,
      }
    }

    const targetRateId = data?.rate_id as string | undefined
    const targetCarrier = data?.carrier_id as string | undefined
    const targetService = data?.service_code as string | undefined
    const matched =
      (targetRateId && rates.find((r) => r.rate_id === targetRateId)) ||
      (targetCarrier &&
        targetService &&
        rates.find((r) => r.carrier_id === targetCarrier && r.service_code === targetService)) ||
      this.pickCheapestRate(rates)

    if (!matched) {
      return {
        calculated_amount: toMajor(cachedAmount ?? 0),
        is_calculated_price_tax_inclusive: false,
      }
    }

    try {
      const opt = rateToShippingOption(matched, currency)
      return { calculated_amount: toMajor(opt.amount), is_calculated_price_tax_inclusive: false }
    } catch (err) {
      if (err instanceof CurrencyMismatchError) {
        this.logger_.error(`[shipengine] currency mismatch: ${err.message}`)
        throw new MedusaError(MedusaError.Types.INVALID_DATA, err.message)
      }
      throw err
    }
    } catch (outerErr) {
      this.logger_.error(`[shipengine] calculatePrice CRASHED: ${(outerErr as Error).message}\n${(outerErr as Error).stack}`)
      return { calculated_amount: 0, is_calculated_price_tax_inclusive: false }
    }
  }

  async createFulfillment(
    data: Record<string, unknown>,
    items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
    order: Partial<FulfillmentOrderDTO> | undefined,
    fulfillment: Partial<Omit<FulfillmentDTO, "provider_id" | "data" | "items">>,
  ): Promise<CreateFulfillmentResult> {
    // ---------- Heat hold gate ----------
    const heatHoldEnabled = await this.siteConfigGet<boolean>("heat_hold_enabled", false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderMeta = (order as any)?.metadata as Record<string, unknown> | undefined
    const override = orderMeta?.heat_hold_override === true
    if (heatHoldEnabled && !override) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Heat hold is active. Set order.metadata.heat_hold_override = true to dispatch this order.",
        HEAT_HOLD_BLOCKED_CODE,
      )
    }

    // ---------- Auto-pick cheapest gate ----------
    const autoPick = await this.siteConfigGet<boolean>("auto_pick_cheapest_label", true)
    const customerChoice = {
      rate_id: data?.rate_id as string | undefined,
      carrier_id: data?.carrier_id as string | undefined,
      carrier_code: data?.carrier_code as string | undefined,
      service_code: data?.service_code as string | undefined,
    }

    let chosen = { ...customerChoice }
    let autoPickedFlag = false

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shippingAddress = ((order as any)?.shipping_address ?? (fulfillment as any)?.shipping_address) as
      | NonNullable<CalculateShippingOptionPriceDTO["context"]["shipping_address"]>
      | undefined

    if (autoPick && shippingAddress) {
      try {
        const fresh = await this.fetchRates({
          shippingAddress,
          items: items as unknown as CalculateShippingOptionPriceDTO["context"]["items"],
          currency: "aud",
        })
        const cheapest = this.pickCheapestRate(fresh)
        if (cheapest) {
          chosen = {
            rate_id: cheapest.rate_id,
            carrier_id: cheapest.carrier_id,
            carrier_code: cheapest.carrier_code,
            service_code: cheapest.service_code,
          }
          autoPickedFlag = true
        }
      } catch (err) {
        this.logger_.warn(`[shipengine] auto-pick re-quote failed; honouring customer choice: ${(err as Error).message}`)
      }
    }

    // ---------- Buy label ----------
    let label
    let bought_via: "rate_id" | "direct" = "rate_id"
    if (chosen.rate_id) {
      try {
        label = await this.client_.buyLabelFromRate(chosen.rate_id)
      } catch (err) {
        if (err instanceof ShipEngineApiError && (err.status === 404 || err.status === 400)) {
          this.logger_.info(
            `[shipengine] rate_id ${chosen.rate_id} unusable (${err.status} ${err.code ?? "?"}); falling back to direct buyLabel`,
          )
        } else {
          throw err
        }
      }
    }
    if (!label) {
      if (!chosen.carrier_id || !chosen.service_code) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Unable to purchase label: rate_id failed and no carrier_id/service_code fallback was provided.",
        )
      }
      bought_via = "direct"
      const fromAddress = await this.resolveFromAddress()
      const validateMode = await this.siteConfigGet<"no_validation" | "validate_only" | "validate_and_clean">(
        "shipping_validate_address_mode",
        "validate_and_clean",
      )
      const defaultWeightG = await this.siteConfigGet<number>("shipping_default_item_weight_g", 750)
      const totalWeight = (items ?? []).reduce((sum: number, it: any) => {
        const qty = typeof it.quantity === "number" ? it.quantity : 1
        const w = it.variant?.weight ?? it.product?.weight ?? defaultWeightG
        return sum + w * qty
      }, 0)
      const ship = cartToShipEngineShipment({
        shippingAddress: shippingAddress ?? { country_code: "AU" },
        packages: [{ weightG: totalWeight || defaultWeightG, lengthCm: 39, widthCm: 28, heightCm: 14 }],
        fromAddress,
        carrierIds: [chosen.carrier_id],
        validateMode,
      })
      label = await this.client_.buyLabel({
        shipment: {
          carrier_id: chosen.carrier_id,
          service_code: chosen.service_code,
          validate_address: validateMode,
          ship_to: ship.shipment.ship_to,
          ship_from: ship.shipment.ship_from,
          packages: ship.shipment.packages,
        },
        label_format: "pdf",
        label_layout: "4x6",
      })
    }

    return {
      data: {
        ...(((fulfillment as { data?: Record<string, unknown> }).data) ?? {}),
        label_id: label.label_id,
        rate_id_used: chosen.rate_id ?? null,
        carrier_id: label.carrier_id,
        carrier_code: label.carrier_code,
        service_code: label.service_code,
        tracking_number: label.tracking_number,
        label_url: label.label_download?.pdf ?? label.label_download?.href ?? null,
        bought_via,
        customer_chosen_carrier_code: customerChoice.carrier_code ?? null,
        customer_chosen_service_code: customerChoice.service_code ?? null,
        auto_picked: autoPickedFlag,
      },
      labels: [
        {
          tracking_number: label.tracking_number ?? "",
          tracking_url: "",
          label_url: label.label_download?.pdf ?? label.label_download?.href ?? "",
        },
      ],
    }
  }

  async cancelFulfillment(data: Record<string, unknown>): Promise<unknown> {
    const labelId = data?.label_id as string | undefined
    if (!labelId) return { voided: true, message: "no label_id; nothing to void" }
    return this.client_.voidLabel(labelId)
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async createReturnFulfillment(_fromData: Record<string, unknown>): Promise<CreateFulfillmentResult> {
    return { data: {}, labels: [] }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getFulfillmentDocuments(_data: Record<string, unknown>): Promise<never[]> {
    return []
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getReturnDocuments(_data: Record<string, unknown>): Promise<never[]> {
    return []
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getShipmentDocuments(_data: Record<string, unknown>): Promise<never[]> {
    return []
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async retrieveDocuments(_fulfillmentData: Record<string, unknown>, _documentType: string): Promise<void> {
    return
  }
}

export default ShipEngineProviderService
export const SHIPENGINE_HEAT_HOLD_BLOCKED_CODE = HEAT_HOLD_BLOCKED_CODE
