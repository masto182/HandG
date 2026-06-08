import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { createAdminAuth } from "../helpers/admin-auth"

jest.setTimeout(120_000)

medusaIntegrationTestRunner({
  disableAutoTeardown: true,
  testSuite: ({ api, getContainer }) => {
    describe("Product Images API — /admin/product-images/*", () => {
      let adminHeaders: Record<string, string> = {}
      let productId = ""
      let productWithThumbId = ""

      beforeAll(async () => {
        const container = getContainer()
        const { headers } = await createAdminAuth(api, container as any)
        adminHeaders = headers

        // Create two products: one without thumbnail, one with
        const productModule = container.resolve(Modules.PRODUCT) as any
        const [existingNoThumb] = await productModule.listProducts({ handle: "img-test-no-thumb" })
        if (existingNoThumb) {
          productId = existingNoThumb.id
        } else {
          const p = await productModule.createProducts({
            title: "Image Test No Thumb",
            handle: "img-test-no-thumb",
            status: "published",
          })
          productId = p.id
        }

        const [existingWithThumb] = await productModule.listProducts({
          handle: "img-test-has-thumb",
        })
        if (existingWithThumb) {
          productWithThumbId = existingWithThumb.id
        } else {
          const p = await productModule.createProducts({
            title: "Image Test Has Thumb",
            handle: "img-test-has-thumb",
            status: "published",
            thumbnail: "https://example.com/existing-thumb.jpg",
          })
          productWithThumbId = p.id
        }
      })

      describe("POST /admin/product-images/validate", () => {
        it("matched: filename matches published product handle", async () => {
          const res = await api.post(
            "/admin/product-images/validate",
            {
              images: [
                {
                  filename: "img-test-no-thumb.jpg",
                  url: "https://cdn.example.com/img-test-no-thumb.jpg",
                },
              ],
            },
            { headers: adminHeaders }
          )
          expect(res.status).toBe(200)
          expect(res.data.matched).toBe(1)
          expect(res.data.images[0].status).toBe("matched")
          expect(res.data.images[0].product_id).toBe(productId)
        })

        it("already_has_image: product has existing thumbnail", async () => {
          const res = await api.post(
            "/admin/product-images/validate",
            {
              images: [
                {
                  filename: "img-test-has-thumb.png",
                  url: "https://cdn.example.com/img-test-has-thumb.png",
                },
              ],
            },
            { headers: adminHeaders }
          )
          expect(res.status).toBe(200)
          expect(res.data.already_has_image).toBe(1)
          expect(res.data.images[0].status).toBe("already_has_image")
        })

        it("no_match: filename has no matching product", async () => {
          const res = await api.post(
            "/admin/product-images/validate",
            {
              images: [
                {
                  filename: "completely-unknown-product.jpg",
                  url: "https://cdn.example.com/unknown.jpg",
                },
              ],
            },
            { headers: adminHeaders }
          )
          expect(res.status).toBe(200)
          expect(res.data.no_match).toBe(1)
          expect(res.data.images[0].status).toBe("no_match")
        })

        it("summary counts correct for mixed batch", async () => {
          const res = await api.post(
            "/admin/product-images/validate",
            {
              images: [
                { filename: "img-test-no-thumb.jpg", url: "https://cdn.example.com/a.jpg" },
                { filename: "img-test-has-thumb.png", url: "https://cdn.example.com/b.png" },
                { filename: "no-match-xyz.jpg", url: "https://cdn.example.com/c.jpg" },
              ],
            },
            { headers: adminHeaders }
          )
          expect(res.status).toBe(200)
          expect(res.data.matched).toBe(1)
          expect(res.data.already_has_image).toBe(1)
          expect(res.data.no_match).toBe(1)
        })

        it("401 without admin auth", async () => {
          try {
            await api.post("/admin/product-images/validate", { images: [] })
            expect(true).toBe(false)
          } catch (err: any) {
            expect(err.response.status).toBe(401)
          }
        })
      })

      describe("POST /admin/product-images/commit", () => {
        it("sets thumbnail on matched product", async () => {
          const url = "https://cdn.example.com/img-test-no-thumb-committed.jpg"
          const res = await api.post(
            "/admin/product-images/commit",
            { images: [{ product_id: productId, url }] },
            { headers: adminHeaders }
          )
          expect(res.status).toBe(200)

          // Verify thumbnail was set
          const container = getContainer()
          const productModule = container.resolve(Modules.PRODUCT) as any
          const [updated] = await productModule.listProducts({ id: productId })
          expect(updated.thumbnail).toBe(url)
        })

        it("overwrites existing thumbnail when overwrite: true", async () => {
          const newUrl = "https://cdn.example.com/img-test-has-thumb-overwrite.jpg"
          const res = await api.post(
            "/admin/product-images/commit",
            { images: [{ product_id: productWithThumbId, url: newUrl, overwrite: true }] },
            { headers: adminHeaders }
          )
          expect(res.status).toBe(200)

          const container = getContainer()
          const productModule = container.resolve(Modules.PRODUCT) as any
          const [updated] = await productModule.listProducts({ id: productWithThumbId })
          expect(updated.thumbnail).toBe(newUrl)
        })

        it("401 without admin auth", async () => {
          try {
            await api.post("/admin/product-images/commit", { images: [] })
            expect(true).toBe(false)
          } catch (err: any) {
            expect(err.response.status).toBe(401)
          }
        })
      })
    })
  },
})
