import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { sendTemplate, refreshEmailConfig, getStoreUrl } from "../lib/email"
import * as ReferralRewardedTpl from "../emails/referral-rewarded"
import { REFERRAL_MODULE } from "../modules/referral"

export default async function referralRewardNotifier({ event, container }: SubscriberArgs<any>) {
  const orderId = event.data.id
  const orderModule = container.resolve(Modules.ORDER)
  const customerModule = container.resolve(Modules.CUSTOMER)
  const referralService = container.resolve(REFERRAL_MODULE) as any

  const order = await orderModule.retrieveOrder(orderId)
  if (!order?.customer_id) return

  const referrals = await referralService.listReferrals({
    referred_customer_id: order.customer_id,
  })

  if (referrals.length === 0) return

  const referral = referrals[0]
  const referrerId = referral.referrer_customer_id

  // H4: idempotency — reward exactly once, even if order.payment_captured is
  // re-delivered. (Replaces the fragile "is this their first order?" count.)
  if (referral.reward_sent_at) return

  try {
    await refreshEmailConfig(container)
    const storeUrl = getStoreUrl()
    const [referrer] = await customerModule.listCustomers({ id: referrerId })
    const [referred] = await customerModule.listCustomers({ id: order.customer_id })

    if (referrer?.email) {
      await sendTemplate({
        to: referrer.email,
        customerId: referrer.id,
        category: "referrals",
        template: ReferralRewardedTpl,
        props: {
          name: referrer.first_name || "Collector",
          referralName: referred?.first_name || "your referral",
          storeUrl,
        },
        container,
      })
    }

    // Mark rewarded so a replayed event can't double-send.
    await referralService.updateReferrals({
      id: referral.id,
      reward_sent_at: new Date(),
    })
  } catch (err) {
    console.error(`[Referral] Failed to notify referrer:`, err)
  }
}

export const config: SubscriberConfig = {
  event: "order.payment_captured",
}
