import { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { sendTemplate, refreshEmailConfig, getStoreUrl } from "../lib/email"
import { createInboxNotification } from "../lib/create-inbox-notification"
import { BROADCAST_MODULE } from "../modules/broadcast"
import * as BroadcastAnnouncementTpl from "../emails/broadcast-announcement"

/** Recipients whose email fails this many times are marked terminally failed. */
export const EMAIL_ATTEMPT_CAP = 3
/** Per-run cap on recipients dispatched, across all in-flight broadcasts. */
const BATCH_SIZE = 50

export default async function broadcastDispatch(container: MedusaContainer) {
  const logger = container.resolve("logger") as any
  const broadcastService = container.resolve(BROADCAST_MODULE) as any
  const customerModule = container.resolve(Modules.CUSTOMER)

  const broadcasts = await broadcastService.listBroadcasts({ status: "sending" })
  if (!broadcasts.length) return

  await refreshEmailConfig(container)
  const storeUrl = getStoreUrl()
  let dispatchedThisRun = 0

  for (const broadcast of broadcasts) {
    if (dispatchedThisRun >= BATCH_SIZE) break

    const pending = await broadcastService.listBroadcastRecipients({
      broadcast_id: broadcast.id,
      dispatched_at: null,
    })

    if (pending.length === 0) {
      await finalizeBroadcast(broadcastService, broadcast.id)
      continue
    }

    const remainingBudget = BATCH_SIZE - dispatchedThisRun
    const batch = pending.slice(0, remainingBudget)
    let sentDelta = 0
    let failedDelta = 0

    for (const recipient of batch) {
      try {
        const [customer] = await customerModule.listCustomers({ id: recipient.customer_id })
        if (!customer) {
          await broadcastService.updateBroadcastRecipients({
            id: recipient.id,
            dispatched_at: new Date(),
            skip_reason: "customer_missing",
          })
          dispatchedThisRun++
          continue
        }

        let inappSent = recipient.inapp_sent
        if (!inappSent) {
          await createInboxNotification(
            container,
            recipient.customer_id,
            "broadcast",
            broadcast.title,
            broadcast.body,
            {
              broadcast_id: broadcast.id,
              link_url: broadcast.link_url,
              link_text: broadcast.link_text,
            }
          )
          inappSent = true
        }

        let emailSent = recipient.email_sent
        let emailAttempts = recipient.email_attempts
        let skipReason: string | null = null
        let done = emailSent

        if (!emailSent && customer.email) {
          emailAttempts++
          const result = await sendTemplate({
            to: customer.email,
            customerId: customer.id,
            category: "announcements",
            template: BroadcastAnnouncementTpl,
            props: {
              name: customer.first_name || "Collector",
              title: broadcast.title,
              body: broadcast.body,
              linkText: broadcast.link_text,
              linkUrl: broadcast.link_url,
              storeUrl,
            },
            container,
          })

          if (result.sent) {
            emailSent = true
            done = true
          } else if (result.reason === "opted_out" || result.reason === "customer_missing") {
            // Not retryable — customer explicitly opted out or no longer exists.
            skipReason = result.reason
            done = true
          } else if (result.reason === "no_resend_key") {
            // Env not configured for email — not a transient failure, don't retry/count as failed.
            skipReason = "no_resend_key"
            done = true
          } else if (emailAttempts >= EMAIL_ATTEMPT_CAP) {
            skipReason = "email_failed_cap"
            done = true
          }
          // else: leave done=false so the job retries next run.
        } else if (!customer.email) {
          skipReason = "no_email"
          done = true
        }

        await broadcastService.updateBroadcastRecipients({
          id: recipient.id,
          inapp_sent: inappSent,
          email_sent: emailSent,
          email_attempts: emailAttempts,
          skip_reason: skipReason,
          dispatched_at: done ? new Date() : null,
        })

        dispatchedThisRun++
        if (done) {
          if (skipReason === "email_failed_cap") {
            failedDelta++
          } else if (!skipReason) {
            sentDelta++
          }
        }
      } catch (err) {
        logger.error(`[Broadcast] Failed dispatching ${recipient.id}: ${err}`)
      }
    }

    if (sentDelta > 0 || failedDelta > 0) {
      await broadcastService.updateBroadcasts({
        id: broadcast.id,
        sent_count: broadcast.sent_count + sentDelta,
        failed_count: broadcast.failed_count + failedDelta,
      })
    }

    const stillPending = await broadcastService.listBroadcastRecipients({
      broadcast_id: broadcast.id,
      dispatched_at: null,
    })
    if (stillPending.length === 0) {
      await finalizeBroadcast(broadcastService, broadcast.id)
    }
  }

  logger.info(`[Broadcast] Dispatch run complete: ${dispatchedThisRun} recipients processed`)
}

async function finalizeBroadcast(broadcastService: any, broadcastId: string) {
  const broadcast = await broadcastService.retrieveBroadcast(broadcastId)
  await broadcastService.updateBroadcasts({
    id: broadcastId,
    status: broadcast.failed_count > 0 ? "failed" : "sent",
    sent_at: new Date(),
  })
}

export const config = {
  name: "broadcast-dispatch",
  schedule: "*/1 * * * *",
}
