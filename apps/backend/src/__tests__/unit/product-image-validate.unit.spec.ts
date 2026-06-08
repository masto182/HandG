import { filenameToHandle, classifyImages } from "../../api/admin/product-images/validate/route"

describe("product-images validate helpers", () => {
  // ─── filenameToHandle ───────────────────────────────────────────────────────

  describe("filenameToHandle", () => {
    it("strips .jpg extension and lower-cases", () => {
      expect(filenameToHandle("Tree-House-Julius.jpg")).toBe("tree-house-julius")
    })

    it("strips .png extension", () => {
      expect(filenameToHandle("fidens-excelsior.png")).toBe("fidens-excelsior")
    })

    it("strips .webp extension", () => {
      expect(filenameToHandle("some-beer.webp")).toBe("some-beer")
    })

    it("strips .jpeg extension", () => {
      expect(filenameToHandle("my-beer.jpeg")).toBe("my-beer")
    })

    it("preserves hyphens in handle", () => {
      expect(filenameToHandle("mountain-culture-easy-times.jpg")).toBe(
        "mountain-culture-easy-times"
      )
    })

    it("handles filename with no extension gracefully", () => {
      expect(filenameToHandle("no-extension")).toBe("no-extension")
    })
  })

  // ─── classifyImages ─────────────────────────────────────────────────────────

  describe("classifyImages", () => {
    const makeProductMap = (
      entries: Array<{ handle: string; id: string; title: string; thumbnail: string | null }>
    ) =>
      new Map(entries.map((p) => [p.handle, { id: p.id, title: p.title, thumbnail: p.thumbnail }]))

    it("returns 'matched' for a product with no existing thumbnail", () => {
      const map = makeProductMap([
        { handle: "tree-house-julius", id: "prod_1", title: "Tree House Julius", thumbnail: null },
      ])
      const rows = classifyImages(
        [{ filename: "tree-house-julius.jpg", url: "https://cdn.example.com/thj.jpg" }],
        map
      )
      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({
        filename: "tree-house-julius.jpg",
        handle: "tree-house-julius",
        url: "https://cdn.example.com/thj.jpg",
        status: "matched",
        product_id: "prod_1",
        product_title: "Tree House Julius",
      })
    })

    it("returns 'already_has_image' for a product with an existing thumbnail", () => {
      const existingThumb = "https://minio.local/existing.jpg"
      const map = makeProductMap([
        {
          handle: "fidens-excelsior",
          id: "prod_2",
          title: "Fidens Excelsior",
          thumbnail: existingThumb,
        },
      ])
      const rows = classifyImages(
        [{ filename: "fidens-excelsior.jpg", url: "https://cdn.example.com/fe.jpg" }],
        map
      )
      expect(rows[0]).toMatchObject({
        status: "already_has_image",
        product_id: "prod_2",
        existing_thumbnail: existingThumb,
      })
    })

    it("returns 'no_match' when handle is not in the product map", () => {
      const map = makeProductMap([])
      const rows = classifyImages(
        [{ filename: "unknown-beer.jpg", url: "https://cdn.example.com/unk.jpg" }],
        map
      )
      expect(rows[0]).toMatchObject({
        status: "no_match",
        handle: "unknown-beer",
      })
      expect(rows[0].product_id).toBeUndefined()
    })

    it("classifies a batch with mixed statuses correctly", () => {
      const map = makeProductMap([
        { handle: "tree-house-julius", id: "prod_1", title: "Julius", thumbnail: null },
        {
          handle: "fidens-excelsior",
          id: "prod_2",
          title: "Excelsior",
          thumbnail: "https://x.com/e.jpg",
        },
      ])
      const rows = classifyImages(
        [
          { filename: "tree-house-julius.jpg", url: "https://cdn.example.com/1.jpg" },
          { filename: "fidens-excelsior.jpg", url: "https://cdn.example.com/2.jpg" },
          { filename: "unknown-beer.jpg", url: "https://cdn.example.com/3.jpg" },
        ],
        map
      )
      expect(rows).toHaveLength(3)
      expect(rows[0].status).toBe("matched")
      expect(rows[1].status).toBe("already_has_image")
      expect(rows[2].status).toBe("no_match")
    })

    it("is case-insensitive for handle matching via filenameToHandle", () => {
      const map = makeProductMap([
        { handle: "hop-nation-galaxy", id: "prod_5", title: "Galaxy", thumbnail: null },
      ])
      // filename has uppercase — filenameToHandle lower-cases before lookup
      const rows = classifyImages(
        [{ filename: "Hop-Nation-Galaxy.JPG", url: "https://cdn.example.com/galaxy.jpg" }],
        map
      )
      expect(rows[0].status).toBe("matched")
    })

    it("preserves the URL from the input in the output row", () => {
      const map = makeProductMap([
        { handle: "test-beer", id: "prod_6", title: "Test Beer", thumbnail: null },
      ])
      const url = "https://minio.local/bucket/test-beer.jpg"
      const rows = classifyImages([{ filename: "test-beer.jpg", url }], map)
      expect(rows[0].url).toBe(url)
    })
  })
})
