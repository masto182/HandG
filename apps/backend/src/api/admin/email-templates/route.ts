import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { EMAIL_PREVIEW_REGISTRY } from "../../../lib/email-preview-registry"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const templates = Object.entries(EMAIL_PREVIEW_REGISTRY).map(([name, entry]) => ({
    name,
    label: entry.label,
  }))
  res.json({ templates })
}
