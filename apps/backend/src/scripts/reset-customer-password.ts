import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export default async function resetCustomerPassword({ container }: ExecArgs) {
  const logger = container.resolve("logger") as any
  const customerModule = container.resolve(Modules.CUSTOMER) as any
  const authModule = container.resolve("auth") as any

  // --- EDIT THESE ---
  const email: string = ""
  const newPassword: string = ""
  // ------------------

  if (!email || !newPassword) {
    logger.error("Set email and newPassword in the script before running.")
    return
  }

  if ((newPassword as string).length < 12) {
    logger.error("newPassword must be at least 12 characters.")
    return
  }

  const customers = await customerModule.listCustomers({ email })
  if (!customers.length) {
    logger.error(`No customer found with email: ${email}`)
    return
  }
  logger.info(`Found customer: ${customers[0].id}`)

  const result = await authModule.updateProvider("emailpass", {
    entity_id: email,
    password: newPassword,
  })

  if (!result?.success) {
    logger.error(`Password reset failed: ${result?.error || "unknown error"}`)
    return
  }

  logger.info(`Password reset successfully for ${email}`)
}
