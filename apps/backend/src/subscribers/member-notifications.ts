import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { sendTemplate, refreshEmailConfig, getStoreUrl } from "../lib/email"
import * as ApplicationReceivedTpl from "../emails/application-received"
import * as ApplicationApprovedTpl from "../emails/application-approved"
import * as ApplicationRejectedTpl from "../emails/application-rejected"

type Logger = {
  info: (msg: string) => void
  error: (msg: string) => void
}

/**
 * Listens for customer.updated and sends a transactional email when the
 * customer's metadata.status transitions to approved or rejected.
 * Suspension/reactivation are admin-only ops without templates this sprint.
 */
export default async function memberStatusNotifier({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger") as Logger
  const customerModule = container.resolve(Modules.CUSTOMER)

  try {
    await refreshEmailConfig(container)
    const [customer] = await customerModule.listCustomers({ id: event.data.id })
    if (!customer?.email) return

    const status = (customer.metadata as any)?.status
    const storeUrl = getStoreUrl()
    const name = customer.first_name || "Collector"

    if (status === "pending") {
      const result = await sendTemplate({
        to: customer.email,
        customerId: customer.id,
        category: "applications",
        template: ApplicationReceivedTpl,
        props: { name, storeUrl },
        container,
      })
      logger.info(
        `[Notification] received → ${customer.email}: ${JSON.stringify(result)}`
      )
      return
    }

    if (status === "approved") {
      const referralCode = (customer.metadata as any)?.referral_code || ""
      const result = await sendTemplate({
        to: customer.email,
        customerId: customer.id,
        category: "applications",
        template: ApplicationApprovedTpl,
        props: { name, referralCode, storeUrl },
        container,
      })
      logger.info(
        `[Notification] approved → ${customer.email}: ${JSON.stringify(result)}`
      )
      return
    }

    if (status === "rejected") {
      const result = await sendTemplate({
        to: customer.email,
        customerId: customer.id,
        category: "applications",
        template: ApplicationRejectedTpl,
        props: { name, storeUrl },
        container,
      })
      logger.info(
        `[Notification] rejected → ${customer.email}: ${JSON.stringify(result)}`
      )
      return
    }
  } catch (err) {
    logger.error(
      `[Notification] customer.updated handler failed for ${event.data.id}: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "customer.updated",
}
