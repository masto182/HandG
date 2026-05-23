import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import reactivateMemberWorkflow from "../../../../../workflows/reactivate-member"

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params

  await reactivateMemberWorkflow(req.scope).run({
    input: { customer_id: id },
  })

  res.json({ success: true })
}
