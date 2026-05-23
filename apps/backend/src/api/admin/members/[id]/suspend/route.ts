import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import suspendMemberWorkflow from "../../../../../workflows/suspend-member"

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params

  await suspendMemberWorkflow(req.scope).run({
    input: { customer_id: id },
  })

  res.json({ success: true })
}
