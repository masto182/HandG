import { Modules } from "@medusajs/framework/utils"

const accounts = [
  { email: "approved@example.test", password: "TestApproved123!", group: "approved" },
  { email: "vip@example.test", password: "TestVip123!", group: "vip3" },
  { email: "pending@example.test", password: "TestPending123!", group: "pending" },
]

export default async function seedTestAccounts({ container }: { container: any }) {
  const logger = container.resolve("logger")
  const customerModule = container.resolve(Modules.CUSTOMER) as any
  const authModule = container.resolve(Modules.AUTH) as any
  const { createCustomerAccountWorkflow } = await import("@medusajs/medusa/core-flows")
  const workflow = createCustomerAccountWorkflow(container)

  for (const acct of accounts) {
    const existing = await customerModule.listCustomers({ email: acct.email })
    if (existing.length) {
      logger.info(`  ${acct.email} already exists, skipping`)
      continue
    }

    try {
      const reg = await authModule.register("emailpass", {
        body: { email: acct.email, password: acct.password },
      } as any)
      const token: string =
        typeof reg === "string" ? reg : (reg?.authIdentity?.id ?? reg?.location ?? reg?.id)
      if (!token) {
        logger.warn(`  ${acct.email}: no token returned`)
        continue
      }

      const authIdentityId = token.includes(".")
        ? JSON.parse(Buffer.from(token.split(".")[1], "base64").toString("utf8")).auth_identity_id
        : token

      const { result } = await workflow.run({
        input: {
          authIdentityId,
          customerData: {
            email: acct.email,
            first_name: acct.group,
            last_name: "TestUser",
            metadata: { status: acct.group === "pending" ? "pending" : "active" },
          },
        } as any,
      })
      const customerId = (result as any).id

      let [group] = await customerModule.listCustomerGroups({ name: acct.group })
      if (!group) group = await customerModule.createCustomerGroups({ name: acct.group })
      await customerModule.addCustomerToGroup({
        customer_id: customerId,
        customer_group_id: group.id,
      })
      logger.info(`  Created ${acct.email} in group ${acct.group} (${customerId})`)
    } catch (err) {
      logger.warn(`  ${acct.email} skipped: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  logger.info("=== TEST ACCOUNTS SEEDED ===")
}
