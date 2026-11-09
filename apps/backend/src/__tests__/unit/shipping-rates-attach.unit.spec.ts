import { attachShippingOptionIds } from "../../api/store/shipping/rates/route"
import { SERVICE_FAMILIES, familyOptionData } from "../../modules/shipping-common/service-families"

const logger = { warn: jest.fn(), info: () => {}, error: () => {} }

const rate = (id: string, provider_id: string, service_code: string) =>
  ({ id, provider_id, amount: 1000, data: { service_code } }) as any

const familyOptions = SERVICE_FAMILIES.map((f) => ({
  id: `so_${f.family}`,
  data: familyOptionData(f),
}))

const queryWith = (options: unknown[]) => ({ graph: jest.fn(async () => ({ data: options })) })

describe("rates route attachShippingOptionIds", () => {
  it("attaches the family option id per rate", async () => {
    const out = await attachShippingOptionIds(
      [
        rate("a", "shipengine", "aramex_au_walleted_standard"),
        rate("b", "shipengine", "couriersplease_walleted_parcel"),
        rate("c", "auspost", "AUS_PARCEL_EXPRESS"),
      ],
      queryWith([...familyOptions, { id: "so_legacy", data: {} }]),
      logger
    )
    expect(out.map((r) => r.shipping_option_id)).toEqual([
      "so_aramex_road_express",
      "so_couriersplease_parcel",
      "so_auspost_express_post",
    ])
  })

  it("drops rates with no matching option", async () => {
    const out = await attachShippingOptionIds(
      [
        rate("a", "shipengine", "aramex_au_walleted_standard"),
        rate("z", "shipengine", "new_unknown_service"),
      ],
      queryWith(familyOptions),
      logger
    )
    expect(out.map((r) => r.id)).toEqual(["a"])
    expect(logger.warn).toHaveBeenCalled()
  })

  it("returns rates unchanged before the per-service options exist", async () => {
    const rates = [rate("a", "shipengine", "aramex_au_walleted_standard")]
    const out = await attachShippingOptionIds(
      rates,
      queryWith([{ id: "so_legacy", data: {} }]),
      logger
    )
    expect(out).toEqual(rates)
    expect(out[0].shipping_option_id).toBeUndefined()
  })
})
