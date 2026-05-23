import { z } from "zod"
import { safeText } from "../../../../lib/util/sanitize-text"

const REFERRAL_CODE_RE = /^[A-Z0-9-]{4,32}$/i
const UNTAPPD_ID_RE = /^[A-Za-z0-9._-]{1,40}$/

export const RegisterCustomerSchema = z.object({
  email: z.string().email().max(254),
  first_name: z
    .string()
    .min(1)
    .max(80)
    .transform((s) => safeText(s, 80))
    .refine((s) => s.length >= 1, "first_name required"),
  last_name: z
    .string()
    .min(1)
    .max(80)
    .transform((s) => safeText(s, 80))
    .refine((s) => s.length >= 1, "last_name required"),
  date_of_birth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .refine((d) => !isNaN(Date.parse(d)), "Invalid date"),
  why_join: z
    .string()
    .min(1)
    .max(2000)
    .transform((s) => safeText(s, 2000))
    .refine((s) => s.length >= 1, "why_join required"),
  favourite_brewery: z
    .string()
    .min(1)
    .max(120)
    .transform((s) => safeText(s, 120))
    .refine((s) => s.length >= 1, "favourite_brewery required"),
  referral_code: z
    .string()
    .optional()
    .refine(
      (c) => !c || REFERRAL_CODE_RE.test(c),
      "Invalid referral code format"
    ),
  untappd_id: z
    .string()
    .optional()
    .refine(
      (c) => !c || UNTAPPD_ID_RE.test(c),
      "Invalid Untappd id format"
    ),
})

export type RegisterCustomerInput = z.infer<typeof RegisterCustomerSchema>
