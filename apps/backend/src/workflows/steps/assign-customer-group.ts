import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

type AssignCustomerGroupInput = {
  customer_id: string
  group_name: string
  remove_from_group?: string
}

export const assignCustomerGroupStep = createStep(
  "assign-customer-group",
  async (input: AssignCustomerGroupInput, { container }) => {
    const customerModule = container.resolve(Modules.CUSTOMER)

    const [targetGroup] = await customerModule.listCustomerGroups({
      name: input.group_name,
    })

    if (!targetGroup) {
      throw new Error(`Customer group "${input.group_name}" not found`)
    }

    if (input.remove_from_group) {
      const [oldGroup] = await customerModule.listCustomerGroups({
        name: input.remove_from_group,
      })
      if (oldGroup) {
        await customerModule.removeCustomerFromGroup({
          customer_id: input.customer_id,
          customer_group_id: oldGroup.id,
        })
      }
    }

    await customerModule.addCustomerToGroup({
      customer_id: input.customer_id,
      customer_group_id: targetGroup.id,
    })

    return new StepResponse(
      { group_id: targetGroup.id, group_name: input.group_name },
      { customer_id: input.customer_id, group_id: targetGroup.id, previous_group: input.remove_from_group }
    )
  },
  async (compensationInput, { container }) => {
    if (!compensationInput) return
    const customerModule = container.resolve(Modules.CUSTOMER)
    await customerModule.removeCustomerFromGroup({
      customer_id: compensationInput.customer_id,
      customer_group_id: compensationInput.group_id,
    })
    if (compensationInput.previous_group) {
      const [prevGroup] = await customerModule.listCustomerGroups({
        name: compensationInput.previous_group,
      })
      if (prevGroup) {
        await customerModule.addCustomerToGroup({
          customer_id: compensationInput.customer_id,
          customer_group_id: prevGroup.id,
        })
      }
    }
  }
)
