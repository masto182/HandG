import { Modules } from "@medusajs/framework/utils"

export default async function fixGroupMemberships({ container }: { container: any }) {
  const logger = container.resolve("logger")
  const customerModule = container.resolve(Modules.CUSTOMER) as any

  const accounts = [
    { email: "approved@example.test", group: "approved" },
    { email: "pending@example.test", group: "pending" },
  ]

  for (const acct of accounts) {
    const [customer] = await customerModule.listCustomers({ email: acct.email })
    if (!customer) {
      logger.warn(`  ${acct.email}: not found`)
      continue
    }

    // get all groups
    const allGroups = await customerModule.listCustomerGroups({})
    const targetGroup = allGroups.find((g: any) => g.name === acct.group)
    if (!targetGroup) {
      logger.warn(`  group ${acct.group}: not found`)
      continue
    }

    // remove from all current groups
    const currentGroups = await customerModule.listCustomerGroups({
      customers: { id: [customer.id] },
    })
    for (const grp of currentGroups) {
      await customerModule.removeCustomerFromGroup({
        customer_id: customer.id,
        customer_group_id: grp.id,
      })
    }

    // add to correct group
    await customerModule.addCustomerToGroup({
      customer_id: customer.id,
      customer_group_id: targetGroup.id,
    })
    logger.info(`  Fixed ${acct.email} → ${acct.group}`)
  }

  logger.info("=== GROUP FIX COMPLETE ===")
}
