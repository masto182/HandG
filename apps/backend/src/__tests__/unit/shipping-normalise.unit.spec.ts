import {
  carrierDefaultBehaviour,
  classifyDeliveryBehaviour,
  classifyServiceTier,
  isCarrierGroup,
  normaliseRate,
  serviceDisplayName,
} from "../../modules/shipping-common/normalise"

describe("shipping-common normalise", () => {
  describe("classifyServiceTier", () => {
    it.each([
      ["AUS_PARCEL_REGULAR", "auspost", "standard"],
      ["AUS_PARCEL_EXPRESS", "auspost", "express"],
      ["aramex_au_walleted_standard", "shipengine", "standard"],
      ["aramex_au_walleted_leave_at_door", "shipengine", "standard"],
      ["aramex_au_walleted_signature_required", "shipengine", "standard"],
      ["fastway_au_walleted_priority", "shipengine", "express"],
      ["couriersplease_walleted_parcel", "shipengine", "standard"],
    ])("%s -> %s", (code, provider, tier) => {
      expect(classifyServiceTier({ provider_id: provider, service_code: code })).toBe(tier)
    })
  })

  describe("classifyDeliveryBehaviour", () => {
    it.each<[string, string, string[] | undefined, string]>([
      ["AUS_PARCEL_REGULAR", "auspost", undefined, "attempted"],
      ["AUS_PARCEL_REGULAR", "auspost", ["AUS_SERVICE_OPTION_SIGNATURE_ON_DELIVERY"], "signature"],
      ["AUS_PARCEL_EXPRESS", "auspost", ["AUS_SERVICE_OPTION_EXTRA_COVER"], "attempted"],
      ["AUS_PARCEL_EXPRESS", "auspost", ["AUS_SERVICE_OPTION_SIGNATURE_ON_DELIVERY", "AUS_SERVICE_OPTION_EXTRA_COVER"], "signature"],
      ["aramex_au_walleted_standard", "shipengine", undefined, "attempted"],
      ["aramex_au_walleted_leave_at_door", "shipengine", undefined, "leave_at_door"],
      ["aramex_au_walleted_signature_required", "shipengine", undefined, "signature"],
      ["fastway_au_walleted_priority", "shipengine", undefined, "attempted"],
      ["couriersplease_walleted_parcel", "shipengine", undefined, "attempted"],
      // Generic patterns
      ["something_with_signature_on_delivery", "shipengine", undefined, "signature"],
      ["something_atl", "shipengine", undefined, "leave_at_door"],
    ])("%s -> %s", (code, provider, opts, behaviour) => {
      expect(
        classifyDeliveryBehaviour({ provider_id: provider, service_code: code, options: opts }),
      ).toBe(behaviour)
    })
  })

  describe("isCarrierGroup", () => {
    it("auspost provider always maps to australia_post group", () => {
      expect(isCarrierGroup({ provider_id: "auspost", service_code: "AUS_PARCEL_REGULAR" })).toEqual({
        group: "australia_post",
        displayName: "Australia Post",
      })
    })
    it("aramex_au_walleted -> aramex", () => {
      expect(
        isCarrierGroup({
          provider_id: "shipengine",
          carrier_code: "aramex_au_walleted",
          service_code: "aramex_au_walleted_standard",
        }),
      ).toEqual({ group: "aramex", displayName: "Aramex" })
    })
    it("fastway_au_walleted -> aramex (sub-brand)", () => {
      expect(
        isCarrierGroup({
          provider_id: "shipengine",
          carrier_code: "aramex_au_walleted",
          service_code: "fastway_au_walleted_priority",
        }),
      ).toEqual({ group: "aramex", displayName: "Aramex" })
    })
    it("couriersplease_walleted -> couriers_please", () => {
      expect(
        isCarrierGroup({
          provider_id: "shipengine",
          carrier_code: "couriersplease_walleted",
          service_code: "couriersplease_walleted_parcel",
        }),
      ).toEqual({ group: "couriers_please", displayName: "CouriersPlease" })
    })
  })

  describe("carrierDefaultBehaviour", () => {
    it("returns attempted for all supported AU carriers", () => {
      expect(carrierDefaultBehaviour("australia_post")).toBe("attempted")
      expect(carrierDefaultBehaviour("aramex")).toBe("attempted")
      expect(carrierDefaultBehaviour("couriers_please")).toBe("attempted")
    })
  })

  describe("normaliseRate", () => {
    it("identifies a default-behaviour AusPost Standard rate", () => {
      const r = normaliseRate({ provider_id: "auspost", service_code: "AUS_PARCEL_REGULAR" })
      expect(r.service_tier).toBe("standard")
      expect(r.delivery_behaviour).toBe("attempted")
      expect(r.is_default_behaviour).toBe(true)
      expect(r.carrier_group).toBe("australia_post")
    })
    it("flags AusPost SOD rate as non-default behaviour", () => {
      const r = normaliseRate({
        provider_id: "auspost",
        service_code: "AUS_PARCEL_EXPRESS",
        options: ["AUS_SERVICE_OPTION_SIGNATURE_ON_DELIVERY"],
      })
      expect(r.delivery_behaviour).toBe("signature")
      expect(r.is_default_behaviour).toBe(false)
    })
    it("flags Aramex leave-at-door as non-default", () => {
      const r = normaliseRate({
        provider_id: "shipengine",
        carrier_code: "aramex_au_walleted",
        service_code: "aramex_au_walleted_leave_at_door",
      })
      expect(r.delivery_behaviour).toBe("leave_at_door")
      expect(r.is_default_behaviour).toBe(false)
      expect(r.carrier_group).toBe("aramex")
    })
  })

  describe("serviceDisplayName", () => {
    it.each([
      [{ provider_id: "auspost", service_code: "AUS_PARCEL_REGULAR" }, "Parcel Post"],
      [{ provider_id: "auspost", service_code: "AUS_PARCEL_EXPRESS" }, "Express Post"],
      [{ provider_id: "shipengine", carrier_code: "aramex_au_walleted", service_code: "aramex_au_walleted_standard" }, "Road Express"],
      [{ provider_id: "shipengine", carrier_code: "aramex_au_walleted", service_code: "aramex_au_walleted_leave_at_door" }, "Road Express - Leave at door"],
      [{ provider_id: "shipengine", carrier_code: "aramex_au_walleted", service_code: "aramex_au_walleted_signature_required" }, "Road Express - Signature"],
      [{ provider_id: "shipengine", carrier_code: "aramex_au_walleted", service_code: "fastway_au_walleted_priority" }, "Priority (overnight)"],
      [{ provider_id: "shipengine", carrier_code: "couriersplease_walleted", service_code: "couriersplease_walleted_parcel" }, "Standard parcel"],
    ])("%j -> %s", (input, expected) => {
      expect(serviceDisplayName(input as any)).toBe(expected)
    })
  })
})
