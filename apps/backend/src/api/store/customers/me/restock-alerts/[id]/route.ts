import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { deleteRestockAlertWorkflow } from "../../../../../../workflows/manage-restock-alert"

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const { id } = req.params

  // Ownership + existence are validated inside the workflow step.
  try {
    await deleteRestockAlertWorkflow(req.scope).run({
      input: { id, customer_id: customerId },
    })
  } catch (err: any) {
    if (err instanceof MedusaError && err.type === MedusaError.Types.NOT_FOUND) {
      return res.status(404).json({ message: "Restock alert not found" })
    }
    if (`${err?.message ?? ""}`.toLowerCase().includes("not found")) {
      return res.status(404).json({ message: "Restock alert not found" })
    }
    throw err
  }

  res.json({ success: true, id, deleted: true })
}
