import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { ValidateImagesSchema } from "../validators"

// ─── Pure helper (exported for unit tests) ────────────────────────────────────

export type ValidateRow = {
  filename: string
  handle: string
  url: string
  status: "matched" | "no_match" | "already_has_image"
  product_id?: string
  product_title?: string
  existing_thumbnail?: string
}

/** Strip extension and lower-case to derive a product handle from a filename. */
export function filenameToHandle(filename: string): string {
  return filename.replace(/\.[^.]+$/, "").toLowerCase()
}

/** Classify uploaded images against a pre-fetched product map. */
export function classifyImages(
  images: Array<{ filename: string; url: string }>,
  productsByHandle: Map<string, { id: string; title: string; thumbnail: string | null }>
): ValidateRow[] {
  return images.map(({ filename, url }) => {
    const handle = filenameToHandle(filename)
    const product = productsByHandle.get(handle)

    if (!product) {
      return { filename, handle, url, status: "no_match" }
    }

    if (product.thumbnail) {
      return {
        filename,
        handle,
        url,
        status: "already_has_image",
        product_id: product.id,
        product_title: product.title,
        existing_thumbnail: product.thumbnail,
      }
    }

    return {
      filename,
      handle,
      url,
      status: "matched",
      product_id: product.id,
      product_title: product.title,
    }
  })
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(
  req: AuthenticatedMedusaRequest<ValidateImagesSchema>,
  res: MedusaResponse
) {
  // workflow-exempt: read-only product lookup, no mutation
  const productModule = req.scope.resolve(Modules.PRODUCT) as any
  const { images } = req.validatedBody

  // Fetch all published products in one query to avoid N+1
  const handles = images.map((img) => filenameToHandle(img.filename))
  const products: Array<{
    id: string
    title: string
    handle: string
    thumbnail: string | null
    status: string
  }> = await productModule.listProducts({
    handle: handles,
    status: ["published"],
  })

  const productsByHandle = new Map(
    products.map((p) => [p.handle, { id: p.id, title: p.title, thumbnail: p.thumbnail }])
  )

  const rows = classifyImages(images, productsByHandle)

  const matched = rows.filter((r) => r.status === "matched").length
  const alreadyHasImage = rows.filter((r) => r.status === "already_has_image").length
  const noMatch = rows.filter((r) => r.status === "no_match").length

  res.json({
    images: rows,
    matched,
    already_has_image: alreadyHasImage,
    no_match: noMatch,
  })
}
