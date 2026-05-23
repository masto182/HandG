import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

const TIER_GROUPS = ["approved", "vip1", "vip2", "vip3", "vip4", "vip5"]

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context.actor_id
  const customerModule = req.scope.resolve(Modules.CUSTOMER)

  try {
    const groups = await customerModule.listCustomerGroups({})
    const relations = await customerModule.listCustomerGroupCustomers({
      customer_id: customerId,
    })

    const customerGroupIds = relations.map((r: any) => r.customer_group_id)

    for (const group of groups) {
      if (customerGroupIds.includes(group.id)) {
        if (TIER_GROUPS.includes(group.name)) {
          return res.json({ status: group.name })
        }
        if (group.name === "pending") {
          return res.json({ status: "pending" })
        }
        if (group.name === "rejected") {
          return res.json({ status: "rejected" })
        }
        if (group.name === "suspended") {
          return res.json({ status: "suspended" })
        }
      }
    }

    res.json({ status: "public" })
  } catch {
    res.json({ status: "public" })
  }
}
