import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { EMAIL_LOG_MODULE } from "../../../../modules/email-log"

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const emailLogService = req.scope.resolve(EMAIL_LOG_MODULE) as any
  const log = await emailLogService.retrieveEmailLog(req.params.id)
  res.json({ log })
}
