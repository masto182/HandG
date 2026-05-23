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

import { getAusPostClient } from "./factory"
import {
  PAC_COVER_CAP_BASE_AUD,
  PAC_COVER_CAP_SOD_AUD,
  quoteService,
  serviceDisplayName,
  type RateOptions,
  type ShipmentQuote,
} from "./mapping"
import {
  CONTAINER_WEIGHTS,
  packItems,
  resolveContainerType,
  type PackableItem,
  type PackedBox,
} from "../shipping-common/packing"
import type { PacServiceCode } from "./types"

const HEAT_HOLD_BLOCKED_CODE = "HEAT_HOLD_BLOCKED"

type InjectedDependencies = {
  logger: Logger
}

type ProviderOptions = {
  api_key?: string
  api_base?: string
}

type SiteConfigLike = {
  get(key: string): Promise<unknown>
}

type ContainerLike = {
  resolve(name: string): unknown
} & InjectedDependencies

/**
 * AusPost PAC fulfillment provider.
 *
 * - calculatePrice: per-box PAC calls, summed, with optional Extra Cover and
 *   Signature on Delivery automatically added based on cart subtotal.
 * - createFulfillment: marks the fulfillment as manual_lodgement and
 *   records the per-box breakdown so the admin can lodge each parcel via
 *   MyPost Business and paste tracking back. No programmatic label purchase.
 * - cancelFulfillment: no-op (nothing was bought).
 */
class AusPostProviderService extends AbstractFulfillmentProviderService {
  static identifier = "auspost"

  protected readonly logger_: Logger
  protected readonly options_: ProviderOptions
  protected readonly client_: ReturnType<typeof getAusPostClient>
  protected readonly container_: ContainerLike | null

  constructor(deps: InjectedDependencies & Partial<ContainerLike>, options: ProviderOptions = {}) {
    super()
    this.logger_ = deps.logger
    this.options_ = options
    this.container_ = deps as unknown as ContainerLike
    this.client_ = getAusPostClient({
      apiKey: options.api_key,
      base: options.api_base,
    })
  }

  // ---------- helpers ----------

  private async siteConfigGet<T>(key: string, fallback: T): Promise<T> {
    if (!this.container_) return fallback
    try {
      const svc = this.container_.resolve("siteConfig") as SiteConfigLike
      const value = await svc.get(key)
      return value === undefined || value === null ? fallback : (value as T)
    } catch {
      return fallback
    }
  }

  private async resolveFromPostcode(): Promise<string> {
    return this.siteConfigGet<string>("shipping_from_postcode", "3037")
  }

  private async resolveRateOptions(): Promise<RateOptions> {
    return {
      coverThresholdAud: await this.siteConfigGet<number>("auspost_extra_cover_threshold_aud", 200),
      sodTriggerAud: await this.siteConfigGet<number>("auspost_sod_trigger_aud", 300),
      discountPctStandard: await this.siteConfigGet<number>("auspost_discount_pct_standard", 0),
      discountPctExpress: await this.siteConfigGet<number>("auspost_discount_pct_express", 0),
    }
  }

  private async resolveServicesEnabled(): Promise<PacServiceCode[]> {
    const raw = await this.siteConfigGet<string[]>(
      "auspost_services_enabled",
      ["AUS_PARCEL_REGULAR", "AUS_PARCEL_EXPRESS"],
    )
    return raw.filter((c): c is PacServiceCode =>
      c === "AUS_PARCEL_REGULAR" || c === "AUS_PARCEL_EXPRESS",
    )
  }

  private buildPackedBoxes(
    items: CalculateShippingOptionPriceDTO["context"]["items"] | undefined,
    defaultWeightG: number,
  ): PackedBox[] {
    const packable: PackableItem[] = ((items ?? []) as Array<{
      quantity: number
      variant?: {
        weight?: number | null
        options?: Array<{ value?: string; option?: { title?: string } }>
      } | null
      product?: { weight?: number | null } | null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadata?: any
    }>).map((it) => {
      const formatOpt = (it.variant?.options ?? []).find(
        (o) => (o?.option?.title ?? "").toLowerCase() === "format",
      )?.value
      const containerType = resolveContainerType(formatOpt ?? null)
      const weight =
        it.variant?.weight ?? it.product?.weight ?? CONTAINER_WEIGHTS[containerType] ?? defaultWeightG
      return {
        quantity: typeof it.quantity === "number" ? it.quantity : Number(it.quantity ?? 1),
        weightG: weight,
        containerType,
      }
    })
    return packItems(packable)
  }

  // ---------- AbstractFulfillmentProviderService overrides ----------

  // eslint-disable-next-line @typescript-eslint/require-await
  async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    return [
      {
        id: "auspost-dynamic",
        name: "Australia Post (PAC)",
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
    const code = data?.service_code as string | undefined
    if (!code || (code !== "AUS_PARCEL_REGULAR" && code !== "AUS_PARCEL_EXPRESS")) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "AusPost shipping method requires `service_code` of AUS_PARCEL_REGULAR or AUS_PARCEL_EXPRESS.",
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
    // Cents -> dollars at the Medusa boundary (storefront still sends/displays cents).
    const toMajor = (cents: number) => cents / 100
    const cachedAmount = typeof data?.amount === "number" ? (data.amount as number) : undefined

    if (!context?.shipping_address) {
      return {
        calculated_amount: toMajor(cachedAmount ?? 0),
        is_calculated_price_tax_inclusive: false,
      }
    }

    const country = (context.shipping_address.country_code ?? "").toLowerCase()
    if (country !== "au") {
      // PAC is AU-domestic only.
      return { calculated_amount: toMajor(cachedAmount ?? 0), is_calculated_price_tax_inclusive: false }
    }

    const enabled = await this.siteConfigGet<boolean>("auspost_enabled", false)
    if (!enabled) {
      return { calculated_amount: toMajor(cachedAmount ?? 0), is_calculated_price_tax_inclusive: false }
    }

    const fromPostcode = await this.resolveFromPostcode()
    const toPostcode = (context.shipping_address.postal_code ?? "").trim()
    if (!toPostcode || !/^\d{4}$/.test(toPostcode)) {
      return { calculated_amount: toMajor(cachedAmount ?? 0), is_calculated_price_tax_inclusive: false }
    }

    const defaultWeightG = await this.siteConfigGet<number>("shipping_default_item_weight_g", 750)
    const packedBoxes = this.buildPackedBoxes(context.items, defaultWeightG)
    if (!packedBoxes.length) {
      return { calculated_amount: toMajor(cachedAmount ?? 0), is_calculated_price_tax_inclusive: false }
    }

    const services = await this.resolveServicesEnabled()
    const requestedService =
      (data?.service_code as PacServiceCode | undefined) ?? services[0] ?? "AUS_PARCEL_REGULAR"
    if (!services.includes(requestedService)) {
      return { calculated_amount: toMajor(cachedAmount ?? 0), is_calculated_price_tax_inclusive: false }
    }

    const opts = await this.resolveRateOptions()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cartSubtotalCents = ((context as any).subtotal ?? (context as any).item_total ?? 0) as number
    const cartSubtotalAud = Math.max(0, cartSubtotalCents / 100)
    // Customer-driven signature opt-in: storefront may set data.force_sod = true
    // (or pass a require_signature flag through the rates route which threads
    // it onto the calculate context). Either way, force SOD on regardless of
    // subtotal threshold when the flag is true.
    const forceSod =
      (data?.force_sod === true) ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((context as any)?.require_signature === true)

    let quote: ShipmentQuote
    try {
      quote = await quoteService({
        client: this.client_,
        packedBoxes,
        fromPostcode,
        toPostcode,
        serviceCode: requestedService,
        cartSubtotalAud,
        opts,
        forceSod,
      })
    } catch (err) {
      this.logger_.warn(`[auspost] calculatePrice failed: ${(err as Error).message}`)
      return { calculated_amount: toMajor(cachedAmount ?? 0), is_calculated_price_tax_inclusive: false }
    }

    return { calculated_amount: toMajor(quote.customer_total_cents), is_calculated_price_tax_inclusive: false }
  }

  async createFulfillment(
    data: Record<string, unknown>,
    items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
    order: Partial<FulfillmentOrderDTO> | undefined,
    fulfillment: Partial<Omit<FulfillmentDTO, "provider_id" | "data" | "items">>,
  ): Promise<CreateFulfillmentResult> {
    // Heat-hold gate (parity with shipengine, even though AusPost is manual)
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

    // No programmatic label - record manual_lodgement marker so the admin
    // order-detail card can prompt the operator to lodge in MyPost Business.
    const serviceCode = (data?.service_code as PacServiceCode) ?? "AUS_PARCEL_REGULAR"
    const defaultWeightG = await this.siteConfigGet<number>("shipping_default_item_weight_g", 750)
    const packedBoxes = this.buildPackedBoxes(
      items as unknown as CalculateShippingOptionPriceDTO["context"]["items"],
      defaultWeightG,
    )

    return {
      data: {
        ...(((fulfillment as { data?: Record<string, unknown> }).data) ?? {}),
        manual_lodgement: true,
        provider: "auspost",
        service_code: serviceCode,
        service_name: serviceDisplayName(serviceCode),
        per_box_breakdown: packedBoxes.map((b, i) => ({
          index: i,
          weight_g: b.weightG,
          length_cm: b.lengthCm,
          width_cm: b.widthCm,
          height_cm: b.heightCm,
        })),
        cover_cap_aud: PAC_COVER_CAP_BASE_AUD,
        cover_cap_aud_with_sod: PAC_COVER_CAP_SOD_AUD,
        tracking_numbers: [],
        lodged_at: null,
      },
      labels: [],
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async cancelFulfillment(_data: Record<string, unknown>): Promise<unknown> {
    // No programmatic label was bought - nothing to void at PAC.
    return { voided: true, message: "auspost manual_lodgement; nothing to void" }
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

export default AusPostProviderService
export const AUSPOST_HEAT_HOLD_BLOCKED_CODE = HEAT_HOLD_BLOCKED_CODE
