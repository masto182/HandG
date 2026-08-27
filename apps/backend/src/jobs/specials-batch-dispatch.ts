import { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { sendTemplate, refreshEmailConfig, getStoreUrl } from "../lib/email"
import { exceedsThrottle } from "../lib/alert-throttle"
import { withJobLock } from "../lib/job-lock"
import { SPECIALS_BATCH_MODULE } from "../modules/specials-batch"
import { ALERT_DISPATCH_MODULE } from "../modules/alert-dispatch"
import { INBOX_MODULE } from "../modules/inbox"
import { finalizeSpecialsBatch } from "../workflows/send-specials-batch"
import * as SpecialsBroadcastTpl from "../emails/specials-broadcast"

/** Recipients whose email fails this many times are terminally failed. */
export const EMAIL_ATTEMPT_CAP = 3
/** Per-run cap on recipients dispatched, across all in-flight batches. */
const BATCH_SIZE = 50

async function countSentInWindow(
  dispatchService: any,
  customerId: string,
  windowStart: Date
): Promise<number> {
  const recent = await dispatchService.listAlertDispatches({
    customer_id: customerId,
    email_sent: true,
  })
  const inWindow = recent.filter(
    (d: any) => d.dispatched_at && new Date(d.dispatched_at) >= windowStart
  )
  const legacyCount = inWindow.filter((d: any) => !d.email_delivery_id).length
  const digestDeliveryIds = new Set(
    inWindow.filter((d: any) => d.email_delivery_id).map((d: any) => d.email_delivery_id)
  )
  return legacyCount + digestDeliveryIds.size
}

async function runDispatch(container: MedusaContainer) {
  const logger = container.resolve("logger") as any
  const batchService = container.resolve(SPECIALS_BATCH_MODULE) as any
  const dispatchService = container.resolve(ALERT_DISPATCH_MODULE) as any
  const notificationService = container.resolve(INBOX_MODULE) as any
  const customerModule = container.resolve(Modules.CUSTOMER)
  const siteConfig = container.resolve("siteConfig") as any

  const batches = await batchService.listSpecialsBatches({ status: "sending" })
  if (!batches.length) return

  await refreshEmailConfig(container)
  const storeUrl = getStoreUrl()

  const settings = await siteConfig.getMany(["alerts_max_per_day"])
  const now = new Date()
  const maxPerDay = Number(settings.alerts_max_per_day ?? 3)
  const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  let dispatchedThisRun = 0
  const touchedBatchIds = new Set<string>()

  for (const batch of batches) {
    if (dispatchedThisRun >= BATCH_SIZE) break

    try {
      const pending = await batchService.listSpecialsBatchRecipients({
        batch_id: batch.id,
        dispatched_at: null,
      })

      if (pending.length === 0) {
        await finalizeBatch(container, batch.id)
        continue
      }

      touchedBatchIds.add(batch.id)
      const remainingBudget = BATCH_SIZE - dispatchedThisRun
      const recipientBatch = pending.slice(0, remainingBudget)

      const items = await batchService.listSpecialsBatchItems({ batch_id: batch.id })

      for (const recipient of recipientBatch) {
        try {
          const [customer] = await customerModule.listCustomers({ id: recipient.customer_id })

          const [delivery] = await batchService.listSpecialsEmailDeliveries({
            recipient_id: recipient.id,
          })

          if (!customer) {
            await batchService.updateSpecialsBatchRecipients({
              id: recipient.id,
              dispatched_at: now,
            })
            if (delivery && ["pending", "retry"].includes(delivery.status)) {
              await batchService.updateSpecialsEmailDeliveries({
                id: delivery.id,
                status: "skipped",
                skip_reason: "customer_missing",
              })
            }
            dispatchedThisRun++
            continue
          }

          let inappSent = recipient.inapp_sent
          if (!inappSent) {
            try {
              await notificationService.createNotifications({
                customer_id: recipient.customer_id,
                type: "specials",
                title: items.length === 1 ? "On special" : "This week's specials",
                body: `${items.length} product${items.length > 1 ? "s" : ""} on sale now.`,
                metadata: { batch_id: batch.id },
              })
              inappSent = true
            } catch (inappErr) {
              logger.error(
                `[SpecialsBatch] Inbox write failed for ${recipient.customer_id} (batch ${batch.id}): ${inappErr}`
              )
            }
          }

          let emailDone = true
          if (
            customer.email &&
            delivery &&
            !["sent", "skipped", "failed"].includes(delivery.status)
          ) {
            const dueNow = !delivery.next_attempt_at || new Date(delivery.next_attempt_at) <= now
            if (!dueNow) {
              emailDone = false
            } else {
              const sentInWindow = await countSentInWindow(
                dispatchService,
                recipient.customer_id,
                windowStart
              )
              if (exceedsThrottle(sentInWindow, maxPerDay)) {
                emailDone = false
              } else {
                const attempts = delivery.attempts + 1
                const result = await sendTemplate({
                  to: customer.email,
                  customerId: customer.id,
                  category: "specials",
                  template: SpecialsBroadcastTpl,
                  props: {
                    name: customer.first_name || "Collector",
                    message: batch.message ?? null,
                    items: items.map((i: any) => ({
                      productTitle: i.product_title,
                      productHandle: i.product_handle,
                      productThumbnail: i.product_thumbnail,
                      originalPrice: i.original_price,
                      discountedPrice: i.discounted_price,
                      discountType: i.discount_type,
                      discountValue: i.discount_value,
                    })),
                    storeUrl,
                  },
                  container,
                })

                if (result.sent) {
                  await batchService.updateSpecialsEmailDeliveries({
                    id: delivery.id,
                    status: "sent",
                    attempts,
                    sent_at: now,
                  })
                  await dispatchService.createAlertDispatches({
                    customer_id: recipient.customer_id,
                    product_id: items[0]?.product_id ?? "",
                    kind: "specials",
                    channel_email: true,
                    channel_inapp: inappSent,
                    email_sent: true,
                    dispatched_at: now,
                    email_delivery_id: delivery.id,
                  })
                } else if (
                  result.reason === "opted_out" ||
                  result.reason === "customer_missing" ||
                  result.reason === "no_resend_key"
                ) {
                  await batchService.updateSpecialsEmailDeliveries({
                    id: delivery.id,
                    status: "skipped",
                    attempts,
                    skip_reason: result.reason,
                  })
                } else if (attempts >= EMAIL_ATTEMPT_CAP) {
                  await batchService.updateSpecialsEmailDeliveries({
                    id: delivery.id,
                    status: "failed",
                    attempts,
                    skip_reason: "email_failed_cap",
                    last_error: result.reason ?? "unknown",
                  })
                  emailDone = false
                } else {
                  await batchService.updateSpecialsEmailDeliveries({
                    id: delivery.id,
                    status: "retry",
                    attempts,
                    last_error: result.reason ?? "unknown",
                  })
                  emailDone = false
                }
              }
            }
          } else if (
            !customer.email &&
            delivery &&
            ["pending", "retry"].includes(delivery.status)
          ) {
            await batchService.updateSpecialsEmailDeliveries({
              id: delivery.id,
              status: "skipped",
              skip_reason: "no_email",
            })
          }

          const [refreshedDelivery] = await batchService.listSpecialsEmailDeliveries({
            recipient_id: recipient.id,
          })
          const emailFullyDone =
            !refreshedDelivery || ["sent", "skipped", "failed"].includes(refreshedDelivery.status)

          await batchService.updateSpecialsBatchRecipients({
            id: recipient.id,
            inapp_sent: inappSent,
            dispatched_at: inappSent && emailFullyDone ? now : null,
          })

          dispatchedThisRun++
        } catch (err) {
          logger.error(`[SpecialsBatch] Failed dispatching recipient ${recipient.id}: ${err}`)
        }
      }
    } catch (err) {
      logger.error(`[SpecialsBatch] Failed processing batch ${batch.id}: ${err}`)
      continue
    }
  }

  for (const batchId of touchedBatchIds) {
    const stillPending = await batchService.listSpecialsBatchRecipients({
      batch_id: batchId,
      dispatched_at: null,
    })
    if (stillPending.length === 0) {
      await finalizeBatch(container, batchId)
    }
  }

  logger.info(`[SpecialsBatch] Dispatch run complete: ${dispatchedThisRun} recipients processed`)
}

async function finalizeBatch(container: any, batchId: string) {
  const batchService = container.resolve(SPECIALS_BATCH_MODULE) as any
  const recipients = await batchService.listSpecialsBatchRecipients({ batch_id: batchId })
  const recipientIds = recipients.map((r: any) => r.id)
  const deliveries = recipientIds.length
    ? await batchService.listSpecialsEmailDeliveries({ recipient_id: recipientIds })
    : []
  const hasFailed = deliveries.some((d: any) => d.status === "failed")
  const sentCount = deliveries.filter((d: any) => d.status === "sent").length
  const failedCount = deliveries.filter((d: any) => d.status === "failed").length
  await batchService.updateSpecialsBatches({
    id: batchId,
    sent_count: sentCount,
    failed_count: failedCount,
  })
  await finalizeSpecialsBatch(container, batchId, hasFailed ? "failed" : "sent")
}

export default async function specialsBatchDispatch(container: MedusaContainer) {
  const logger = container.resolve("logger") as any
  const outcome = await withJobLock(container, "specials-batch-dispatch", () =>
    runDispatch(container)
  )
  if (outcome.skipped) {
    logger.info("[SpecialsBatch] Skipped tick - another run holds the dispatch lock")
  }
}

export const config = {
  name: "specials-batch-dispatch",
  schedule: "*/1 * * * *",
}
