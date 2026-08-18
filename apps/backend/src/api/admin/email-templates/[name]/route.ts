import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { renderEmail } from "../../../../lib/render-email"
import {
  EMAIL_PREVIEW_REGISTRY,
  refreshEmailPreviewConfig,
} from "../../../../lib/email-preview-registry"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const { name } = req.params
  const entry = EMAIL_PREVIEW_REGISTRY[name]
  if (!entry) {
    res.status(404).json({ message: `Unknown email template: ${name}` })
    return
  }

  await refreshEmailPreviewConfig(req.scope)
  const { props, synthetic } = await entry.getSampleProps(req.scope)
  const { html, subject } = await renderEmail(entry.module, props)

  res.json({ html, subject, synthetic })
}
