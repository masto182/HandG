import { packItems, resolveContainerType, CONTAINER_WEIGHTS, type PackableItem } from "../../modules/shipengine/packing"

describe("shipengine packing", () => {
  describe("resolveContainerType", () => {
    it("returns can for null/undefined", () => {
      expect(resolveContainerType(null)).toBe("can")
      expect(resolveContainerType(undefined)).toBe("can")
      expect(resolveContainerType("")).toBe("can")
    })
    it("returns bottle for Bottle variants", () => {
      expect(resolveContainerType("Bottle")).toBe("bottle")
      expect(resolveContainerType("bottle")).toBe("bottle")
      expect(resolveContainerType("510ml Bottle")).toBe("bottle")
    })
    it("returns crowler for Crowler variants", () => {
      expect(resolveContainerType("Crowler")).toBe("crowler")
      expect(resolveContainerType("1L Crowler")).toBe("crowler")
    })
    it("returns can for Can variants", () => {
      expect(resolveContainerType("Can")).toBe("can")
      expect(resolveContainerType("473ml Can")).toBe("can")
    })
  })

  describe("packItems", () => {
    it("returns empty array for no items", () => {
      expect(packItems([])).toEqual([])
    })

    it("packs 1 can into Small box", () => {
      const items: PackableItem[] = [{ quantity: 1, weightG: 500, containerType: "can" }]
      const boxes = packItems(items)
      expect(boxes).toHaveLength(1)
      expect(boxes[0].lengthCm).toBe(22)
      expect(boxes[0].widthCm).toBe(16)
      expect(boxes[0].heightCm).toBe(7)
      expect(boxes[0].weightG).toBe(500 + 200)
    })

    it("packs 2 cans into Small box", () => {
      const items: PackableItem[] = [{ quantity: 2, weightG: 500, containerType: "can" }]
      const boxes = packItems(items)
      expect(boxes).toHaveLength(1)
      expect(boxes[0].lengthCm).toBe(22)
      expect(boxes[0].weightG).toBe(1000 + 200)
    })

    it("packs 5 cans into Medium box", () => {
      const items: PackableItem[] = [{ quantity: 5, weightG: 500, containerType: "can" }]
      const boxes = packItems(items)
      expect(boxes).toHaveLength(1)
      expect(boxes[0].lengthCm).toBe(24)
      expect(boxes[0].widthCm).toBe(19)
      expect(boxes[0].heightCm).toBe(12)
      expect(boxes[0].weightG).toBe(2500 + 200)
    })

    it("packs 10 cans into Large box", () => {
      const items: PackableItem[] = [{ quantity: 10, weightG: 500, containerType: "can" }]
      const boxes = packItems(items)
      expect(boxes).toHaveLength(1)
      expect(boxes[0].lengthCm).toBe(39)
      expect(boxes[0].widthCm).toBe(28)
      expect(boxes[0].heightCm).toBe(14)
      expect(boxes[0].weightG).toBe(5000 + 200)
    })

    it("packs 20 cans into 2 boxes (Large 16 + Small 4)", () => {
      const items: PackableItem[] = [{ quantity: 20, weightG: 500, containerType: "can" }]
      const boxes = packItems(items)
      expect(boxes).toHaveLength(2)
      expect(boxes[0].lengthCm).toBe(39)
      expect(boxes[0].weightG).toBe(8000 + 200)
      expect(boxes[1].lengthCm).toBe(24)
      expect(boxes[1].weightG).toBe(2000 + 200)
    })

    it("forces Large box when bottle present", () => {
      const items: PackableItem[] = [
        { quantity: 1, weightG: 600, containerType: "bottle" },
        { quantity: 3, weightG: 500, containerType: "can" },
      ]
      const boxes = packItems(items)
      expect(boxes).toHaveLength(1)
      expect(boxes[0].lengthCm).toBe(39)
      expect(boxes[0].weightG).toBe(600 + 1500 + 200)
    })

    it("forces Large box when crowler present", () => {
      const items: PackableItem[] = [
        { quantity: 2, weightG: 1200, containerType: "crowler" },
      ]
      const boxes = packItems(items)
      expect(boxes).toHaveLength(1)
      expect(boxes[0].lengthCm).toBe(39)
      expect(boxes[0].weightG).toBe(2400 + 200)
    })

    it("splits bottles into multiple Large boxes when exceeding capacity", () => {
      const items: PackableItem[] = [
        { quantity: 1, weightG: 600, containerType: "bottle" },
        { quantity: 18, weightG: 500, containerType: "can" },
      ]
      const boxes = packItems(items)
      expect(boxes).toHaveLength(2)
      expect(boxes[0].lengthCm).toBe(39)
      expect(boxes[0].weightG).toBe(600 + 7500 + 200)
      expect(boxes[1].lengthCm).toBe(39)
      expect(boxes[1].weightG).toBe(1500 + 200)
    })

    it("handles mixed crowler + cans overflow", () => {
      const items: PackableItem[] = [
        { quantity: 2, weightG: 1200, containerType: "crowler" },
        { quantity: 15, weightG: 500, containerType: "can" },
      ]
      const boxes = packItems(items)
      expect(boxes).toHaveLength(2)
      expect(boxes[0].weightG).toBe(2400 + 7000 + 200)
      expect(boxes[1].weightG).toBe(500 + 200)
    })
  })

  describe("CONTAINER_WEIGHTS", () => {
    it("has correct default weights", () => {
      expect(CONTAINER_WEIGHTS.can).toBe(500)
      expect(CONTAINER_WEIGHTS.bottle).toBe(600)
      expect(CONTAINER_WEIGHTS.crowler).toBe(1200)
    })
  })
})
