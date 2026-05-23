import {
  isValidAUState,
  isValidAUPostcode,
  doesPostcodeMatchState,
  validateAUAddress,
  AU_STATES,
} from "./au-address-validation"

describe("AU Address Validation", () => {
  describe("isValidAUState", () => {
    it.each(["NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"])(
      "accepts %s",
      (state) => {
        expect(isValidAUState(state)).toBe(true)
      }
    )

    it("accepts lowercase", () => {
      expect(isValidAUState("nsw")).toBe(true)
    })

    it("rejects invalid state", () => {
      expect(isValidAUState("CA")).toBe(false)
      expect(isValidAUState("")).toBe(false)
      expect(isValidAUState("VICTORIA")).toBe(false)
    })
  })

  describe("isValidAUPostcode", () => {
    it("accepts 4-digit postcode", () => {
      expect(isValidAUPostcode("2000")).toBe(true)
      expect(isValidAUPostcode("0800")).toBe(true)
    })

    it("rejects 3 digits", () => {
      expect(isValidAUPostcode("200")).toBe(false)
    })

    it("rejects 5 digits", () => {
      expect(isValidAUPostcode("20000")).toBe(false)
    })

    it("rejects letters", () => {
      expect(isValidAUPostcode("200A")).toBe(false)
    })

    it("rejects empty", () => {
      expect(isValidAUPostcode("")).toBe(false)
    })
  })

  describe("doesPostcodeMatchState", () => {
    it("NSW postcodes start with 1 or 2", () => {
      expect(doesPostcodeMatchState("2000", "NSW")).toBe(true)
      expect(doesPostcodeMatchState("1001", "NSW")).toBe(true)
    })

    it("VIC postcodes start with 3 or 8", () => {
      expect(doesPostcodeMatchState("3000", "VIC")).toBe(true)
      expect(doesPostcodeMatchState("8000", "VIC")).toBe(true)
    })

    it("rejects mismatched state/postcode", () => {
      expect(doesPostcodeMatchState("4000", "NSW")).toBe(false)
    })

    it("ACT accepts 0 and 2 prefixes", () => {
      expect(doesPostcodeMatchState("0200", "ACT")).toBe(true)
      expect(doesPostcodeMatchState("2600", "ACT")).toBe(true)
    })
  })

  describe("validateAUAddress", () => {
    it("returns valid for correct address", () => {
      const result = validateAUAddress({ province: "NSW", postal_code: "2000" })
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it("flags invalid state", () => {
      const result = validateAUAddress({ province: "XX", postal_code: "2000" })
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain("Invalid state")
    })

    it("flags invalid postcode format", () => {
      const result = validateAUAddress({ province: "NSW", postal_code: "20" })
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain("4 digits")
    })

    it("flags mismatched state/postcode", () => {
      const result = validateAUAddress({ province: "QLD", postal_code: "2000" })
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain("does not match")
    })

    it("passes with empty fields (optional validation)", () => {
      const result = validateAUAddress({})
      expect(result.valid).toBe(true)
    })
  })
})
