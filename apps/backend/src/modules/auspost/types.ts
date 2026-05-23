/**
 * Australia Post PAC (Postage Assessment Calculator) API types.
 *
 * Subset of https://developers.auspost.com.au/apis/pac/reference -
 * only the fields we read or set.
 *
 * PAC is a public, retail-priced, AU-domestic rate API. Auth is a single
 * AUTH-KEY header; no account number, no contract required.
 *
 * Note: the PAC test endpoint (test.npe.auspost.com.au) was retired -
 * we hit the prod base URL with the same key for both dev and prod.
 */

export const PAC_BASE = "https://digitalapi.auspost.com.au"

// AU domestic services we surface. PAC returns more (satchel, package boxes)
// but Hops & Glory packs in custom cartons - those code paths are out of scope.
export type PacServiceCode = "AUS_PARCEL_REGULAR" | "AUS_PARCEL_EXPRESS"

export const PAC_SERVICE_NAMES: Record<PacServiceCode, string> = {
  AUS_PARCEL_REGULAR: "Australia Post - Standard",
  AUS_PARCEL_EXPRESS: "Australia Post - Express",
}

export type PacOptionCode =
  | "AUS_SERVICE_OPTION_STANDARD"
  | "AUS_SERVICE_OPTION_EXTRA_COVER"
  | "AUS_SERVICE_OPTION_SIGNATURE_ON_DELIVERY"

// /service.json response
export type PacSubOption = {
  code: PacOptionCode
  name: string
  max_extra_cover?: number
}

export type PacOption = {
  code: PacOptionCode
  name: string
  suboptions?: { option: PacSubOption | PacSubOption[] }
}

export type PacService = {
  code: string
  name: string
  price: string // PAC returns decimal-as-string e.g. "15.05"
  max_extra_cover?: number
  options?: { option: PacOption | PacOption[] }
}

export type PacServiceResponse = {
  services?: { service: PacService | PacService[] }
  error?: PacError
}

// /calculate.json response
export type PacCostLine = {
  item: string
  cost: string
}

export type PacPostageResult = {
  service: string
  delivery_time?: string
  total_cost: string
  costs?: { cost: PacCostLine | PacCostLine[] }
}

export type PacCalculateResponse = {
  postage_result?: PacPostageResult
  error?: PacError
}

export type PacError = {
  errorMessage?: string
  errorName?: string
  errorCode?: string
}

// Request shape for our client - mirrors the PAC GET query params.
export type PacRateRequest = {
  fromPostcode: string
  toPostcode: string
  lengthCm: number
  widthCm: number
  heightCm: number
  weightKg: number
}

export type PacCalculateRequest = PacRateRequest & {
  serviceCode: PacServiceCode | string
  optionCode?: PacOptionCode | PacOptionCode[]
  suboptionCode?: PacOptionCode
  extraCover?: number
}

export interface AusPostPacLikeClient {
  listServices(req: PacRateRequest): Promise<PacService[]>
  calculate(req: PacCalculateRequest): Promise<PacPostageResult>
}

export class PacApiError extends Error {
  status: number
  code?: string

  constructor(status: number, message: string, opts?: { code?: string }) {
    super(message)
    this.name = "PacApiError"
    this.status = status
    this.code = opts?.code
  }
}
