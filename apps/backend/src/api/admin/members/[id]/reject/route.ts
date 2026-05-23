import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import rejectMemberWorkflow from "../../../../../workflows/reject-member"

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params

  await rejectMemberWorkflow(req.scope).run({
    input: { customer_id: id },
  })

  res.json({ success: true })
}
