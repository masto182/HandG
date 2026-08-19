import { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { sendTemplate, refreshEmailConfig, getStoreUrl } from "../lib/email"
import { INBOX_MODULE } from "../modules/inbox"
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

    try {
      const pending = await broadcastService.listBroadcastRecipients({
        broadcast_id: broadcast.id,
        dispatched_at: null,
      })

      if (pending.length === 0) {
        await finalizeBroadcast(broadcastService, broadcast.id)
        continue
      }

      if (!broadcast.channel_inapp && !broadcast.channel_email) {
        const now = new Date()

        for (const recipient of pending) {
          await broadcastService.updateBroadcastRecipients({
            id: recipient.id,
            skip_reason: "no_channels_selected",
            dispatched_at: now,
          })
        }

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
          if (broadcast.channel_inapp && !inappSent) {
            try {
              const notificationService = container.resolve(INBOX_MODULE) as any
              await notificationService.createNotifications({
                customer_id: recipient.customer_id,
                type: "broadcast",
                title: broadcast.title,
                body: broadcast.body,
                metadata: {
                  broadcast_id: broadcast.id,
                  link_url: broadcast.link_url,
                  link_text: broadcast.link_text,
                },
              })
              inappSent = true
            } catch (inappErr) {
              // Don't mark inappSent — leave it false so the job retries next
              // run instead of silently recording a delivery that never happened.
              logger.error(
                `[Broadcast] Inbox write failed for ${recipient.customer_id} (broadcast ${broadcast.id}): ${inappErr}`
              )
            }
          }

          let emailSent = recipient.email_sent
          let emailAttempts = recipient.email_attempts
          let skipReason: string | null = null
          let done = emailSent

          if (broadcast.channel_email) {
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
          }

          const inappDone = !broadcast.channel_inapp || inappSent
          const emailChannelDone = !broadcast.channel_email || done

          await broadcastService.updateBroadcastRecipients({
            id: recipient.id,
            inapp_sent: inappSent,
            email_sent: emailSent,
            email_attempts: emailAttempts,
            skip_reason: skipReason,
            dispatched_at: inappDone && emailChannelDone ? new Date() : null,
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
    } catch (err) {
      logger.error(`[Broadcast] Failed processing ${broadcast.id}: ${err}`)
      continue
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
