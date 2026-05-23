import { stripHtml, safeText } from "../../lib/util/sanitize-text"

describe("sanitize-text", () => {
  describe("stripHtml", () => {
    it("removes script tags", () => {
      expect(stripHtml("<script>alert(1)</script>hello")).toBe("hello")
    })

    it("removes nested tags", () => {
      expect(stripHtml("<div><p>nested <b>text</b></p></div>")).toBe("nested text")
    })

    it("decodes common HTML entities", () => {
      expect(stripHtml("Tom &amp; Jerry &lt;3 &quot;quotes&quot;")).toBe(
        'Tom & Jerry <3 "quotes"'
      )
    })

    it("returns empty string for empty input", () => {
      expect(stripHtml("")).toBe("")
    })
  })

  describe("safeText", () => {
    it("strips tags and trims whitespace", () => {
      expect(safeText("  <b>hi</b>  there  ", 50)).toBe("hi there")
    })

    it("collapses whitespace", () => {
      expect(safeText("a\n\n\tb   c", 50)).toBe("a b c")
    })

    it("caps length", () => {
      expect(safeText("a".repeat(100), 10)).toHaveLength(10)
    })

    it("normalises unicode", () => {
      // U+00C5 vs U+0041 U+030A — both should fold to A-with-ring after NFKC
      expect(safeText("\u0041\u030A", 10).length).toBe(1)
    })

    it("returns empty string for null/undefined", () => {
      expect(safeText(null, 10)).toBe("")
      expect(safeText(undefined, 10)).toBe("")
    })
  })
})
