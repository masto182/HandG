import type { z } from "zod"
import { validateAndTransformBody } from "@medusajs/framework/http"

/**
 * Passing a Zod v4 schema straight into validateAndTransformBody triggers
 * TS2589 (excessively deep type instantiation). Measured cost of the 3 call
 * sites doing that: 29.4M instantiations, 8.2GB heap, 67s check time — which
 * is why CI needed --max-old-space-size=8192.
 *
 * Pinning the generic to a shallow z.ZodType collapses it: 780K
 * instantiations, 590MB, 1.2s. Route handlers should type req.validatedBody
 * themselves via z.infer<typeof Schema>.
 */
export const validateBody = (schema: z.ZodType) => validateAndTransformBody(schema as never)
