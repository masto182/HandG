import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export default async function createApprovedMember({ container }: ExecArgs) {
  const logger = container.resolve("logger") as any
  const customerModule = container.resolve(Modules.CUSTOMER) as any
  const authModule = container.resolve(Modules.AUTH) as any
  const { createCustomerAccountWorkflow } = await import("@medusajs/medusa/core-flows")

  const email = "campbell@hopsandglory.au"
  const password = "HopsGlory2026!"
  const firstName = "Campbell"
  const lastName = "Masterson"

  const existing = await customerModule.listCustomers({ email })
  if (existing.length) {
    logger.info(`Customer ${email} already exists (id: ${existing[0].id}). Skipping.`)
    return
  }

  const reg = await authModule.register("emailpass", {
    body: { email, password },
  } as any)

  const token: string =
    typeof reg === "string" ? reg : (reg?.authIdentity?.id ?? reg?.location ?? reg?.id)

  if (!token) {
    logger.error("Auth registration returned no identity token")
    return
  }

  const authIdentityId = token.includes(".")
    ? JSON.parse(Buffer.from(token.split(".")[1], "base64").toString("utf8")).auth_identity_id
    : token

  const workflow = createCustomerAccountWorkflow(container)
  const { result } = await workflow.run({
    input: {
      authIdentityId,
      customerData: {
        email,
        first_name: firstName,
        last_name: lastName,
        metadata: { status: "active" },
      },
    } as any,
  })

  const customerId = (result as any).id

  let [group] = await customerModule.listCustomerGroups({ name: "approved" })
  if (!group) group = await customerModule.createCustomerGroups({ name: "approved" })
  await customerModule.addCustomerToGroup({
    customer_id: customerId,
    customer_group_id: group.id,
  })

  logger.info(`Created approved member: ${email} (id: ${customerId})`)
}
