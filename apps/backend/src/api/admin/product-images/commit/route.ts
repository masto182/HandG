import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, MedusaError } from "@medusajs/framework/utils"
import { CommitImagesSchema } from "../validators"

export async function POST(
  req: AuthenticatedMedusaRequest<CommitImagesSchema>,
  res: MedusaResponse
) {
  // workflow-exempt: simple per-product image update — no rollback semantics needed
  const productModule = req.scope.resolve(Modules.PRODUCT) as any
  const { images } = req.validatedBody

  // SSRF guard: only allow https:// URLs from non-local, non-metadata hosts.
  const isSafeUrl = (url: string) =>
    /^https:\/\//i.test(url) &&
    !/(169\.254\.|127\.|localhost|metadata\.google\.internal)/i.test(url)

  for (const img of images) {
    if (!isSafeUrl(img.url)) {
      return res.status(400).json({ error: `Unsafe URL rejected: ${img.url}` })
    }
  }

  let updated = 0
  const errors: string[] = []

  for (const { product_id, url, overwrite } of images) {
    try {
      const product = await productModule.retrieveProduct(product_id, {
        select: ["id", "thumbnail"],
      })

      if (product.thumbnail && !overwrite) {
        // Has image and overwrite not requested — still counts as processed
        updated++
        continue
      }

      await productModule.updateProducts(product_id, { thumbnail: url })

      updated++
    } catch (e: any) {
      if (e instanceof MedusaError && e.type === MedusaError.Types.NOT_FOUND) {
        errors.push(`Product ${product_id} not found`)
      } else {
        errors.push(`${product_id}: ${e?.message ?? "unknown error"}`)
      }
    }
  }

  res.json({ updated, errors })
}
