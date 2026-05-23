import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { CAMPAIGN_MODULE } from "../../../../../modules/campaign"

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params
  const body = req.body as { reason?: string }
  const svc = req.scope.resolve(CAMPAIGN_MODULE) as any

  const candidate = await svc.retrieveAgingCandidate(id)
  if (candidate.status !== "pending") {
    return res.status(400).json({ message: "Candidate is not pending" })
  }

  await svc.updateAgingCandidates({
    selector: { id },
    data: { status: "dismissed", dismissed_reason: body?.reason || "Ages well" },
  })

  const updated = await svc.retrieveAgingCandidate(id)
  res.json({ candidate: updated })
}
