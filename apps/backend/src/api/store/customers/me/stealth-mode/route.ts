import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { toggleStealthModeWorkflow } from "../../../../../workflows/toggle-stealth-mode"

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const customerId = req.auth_context.actor_id
  const { enabled } = req.body as { enabled: boolean }

  const { result } = await toggleStealthModeWorkflow(req.scope).run({
    input: { customer_id: customerId, enabled: !!enabled },
  })

  res.json(result)
}
