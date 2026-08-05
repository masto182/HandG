import { z } from "zod"
import type { MiddlewareRoute } from "@medusajs/framework/http"
import { validateBody } from "../../../lib/validate-body"

// ─── Validate ────────────────────────────────────────────────────────────────

export const ValidateImagesSchema = z.object({
  images: z
    .array(
      z.object({
        filename: z.string().min(1),
        url: z.string().url(),
      })
    )
    .min(1),
})
export type ValidateImagesSchema = z.infer<typeof ValidateImagesSchema>

// ─── Commit ───────────────────────────────────────────────────────────────────

export const CommitImagesSchema = z.object({
  images: z
    .array(
      z.object({
        product_id: z.string().min(1),
        url: z.string().url(),
        overwrite: z.boolean().optional().default(false),
      })
    )
    .min(1),
})
export type CommitImagesSchema = z.infer<typeof CommitImagesSchema>

// ─── Middleware arrays ────────────────────────────────────────────────────────

export const productImageMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/product-images/validate",
    method: "POST",
    middlewares: [validateBody(ValidateImagesSchema)],
  },
  {
    matcher: "/admin/product-images/commit",
    method: "POST",
    middlewares: [validateBody(CommitImagesSchema)],
  },
]
