import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import approveMemberWorkflow from "../../../../../workflows/approve-member"

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params

  const { result } = await approveMemberWorkflow(req.scope).run({
    input: { customer_id: id },
  })

  res.json({
    success: true,
    referral_code: (result as any).referral_code,
  })
}
