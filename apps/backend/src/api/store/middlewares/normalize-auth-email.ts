import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// Emailpass auth matches on the stored entity_id with an exact (case-sensitive)
// lookup and stores it verbatim on register. Normalising the email at the HTTP
// boundary keeps every auth_identity lowercase so login is effectively
// case-insensitive without forking the auth provider.
export function normalizeAuthEmail(
  req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) {
  const body = req.body as { email?: unknown } | undefined
  if (body && typeof body.email === "string") {
    body.email = body.email.trim().toLowerCase()
  }
  return next()
}
