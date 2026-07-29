import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import evaluateVipProgressionWorkflow from "../workflows/evaluate-vip-progression"
import { REFERRAL_MODULE } from "../modules/referral"
import { sendTemplate, refreshEmailConfig, getStoreUrl } from "../lib/email"
import * as VipTierUpTpl from "../emails/vip-tier-up"
import { createInboxNotification } from "../lib/create-inbox-notification"

type Logger = {
  info: (msg: string) => void
  error: (msg: string) => void
  warn: (msg: string) => void
}

async function findReferrer(
  referralService: any,
  referredCustomerId: string
): Promise<string | null> {
  const matches = (await referralService.listReferrals({
    referred_customer_id: referredCustomerId,
  })) as Array<{ referrer_customer_id: string; stealth_mode?: boolean }>

  const active = matches.find((r) => !r.stealth_mode) || matches[0]
  return active?.referrer_customer_id ?? null
}

export default async function orderPaymentCapturedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger") as Logger
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const referralService = container.resolve(REFERRAL_MODULE) as any

  try {
    // event.data.id is the payment ID (from PaymentEvents.CAPTURED).
    // Step 1: get the payment_collection_id from the payment.
    const { data: payments } = await query.graph({
      entity: "payment",
      fields: ["id", "payment_collection_id"],
      filters: { id: event.data.id },
    })
    const paymentCollectionId = (payments[0] as any)?.payment_collection_id
    if (!paymentCollectionId) return

    // Step 2: find the order linked to this payment_collection.
    const { data: links } = await query.graph({
      entity: "order_payment_collection",
      fields: ["order_id"],
      filters: { payment_collection_id: paymentCollectionId },
    })
    const orderId = (links[0] as any)?.order_id
    if (!orderId) return

    // Step 3: get customer_id from the order.
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["id", "customer_id"],
      filters: { id: orderId },
    })
    const order = orders[0]
    if (!order?.customer_id) return

    const buyerId = order.customer_id as string
    const parentId = await findReferrer(referralService, buyerId)
    const grandparentId = parentId ? await findReferrer(referralService, parentId) : null

    const targets = [
      { label: "buyer", id: buyerId },
      { label: "parent", id: parentId },
      { label: "grandparent", id: grandparentId },
    ].filter((t) => !!t.id) as Array<{ label: string; id: string }>

    for (const target of targets) {
      try {
        const { result } = await evaluateVipProgressionWorkflow(container).run({
          input: { customer_id: target.id },
        })
        logger.info(
          `[VIP] Progression evaluated for ${target.label} ${target.id} after capture on order ${orderId}: ${JSON.stringify(result)}`
        )

        // Send VIP tier-up email inline when the workflow promoted this customer.
        if ((result as any)?.promoted === true) {
          const newTier = (result as any).new_tier || "vip"
          // In-app inbox notification
          createInboxNotification(
            container,
            target.id,
            "tier_upgrade",
            `You've reached ${newTier.toUpperCase()}`,
            `Your VIP score crossed the ${newTier} threshold. New early-access perks are now active.`,
            { new_tier: newTier, cta: "/account/vip" }
          )
          try {
            await refreshEmailConfig(container)
            const customerModule = container.resolve(Modules.CUSTOMER)
            const [customer] = await customerModule.listCustomers({
              id: target.id,
            })
            if (customer?.email) {
              const sendResult = await sendTemplate({
                to: customer.email,
                customerId: customer.id,
                category: "vip_progression",
                template: VipTierUpTpl,
                props: {
                  name: customer.first_name || "Collector",
                  newTier,
                  storeUrl: getStoreUrl(),
                },
                container,
              })
              logger.info(`[VIP] tier-up email → ${customer.email}: ${JSON.stringify(sendResult)}`)
            }
          } catch (emailErr) {
            logger.error(
              `[VIP] tier-up email failed for ${target.id}: ${emailErr instanceof Error ? emailErr.message : String(emailErr)}`
            )
          }
        }
      } catch (err) {
        logger.error(
          `[VIP] Progression failed for ${target.label} ${target.id} on order ${orderId}: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }
  } catch (error) {
    logger.error(
      `[VIP] Capture handler error: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export const config: SubscriberConfig = {
  // capturePaymentWorkflow emits PaymentEvents.CAPTURED = "payment.captured"
  // with { id: payment_id } — NOT "order.payment_captured" with order_id.
  event: "payment.captured",
}
