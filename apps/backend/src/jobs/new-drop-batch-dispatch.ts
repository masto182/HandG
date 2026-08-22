import { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { sendTemplate, refreshEmailConfig, getStoreUrl } from "../lib/email"
import { isQuietHours, exceedsThrottle } from "../lib/alert-throttle"
import { withJobLock } from "../lib/job-lock"
import { NEW_DROP_BATCH_MODULE } from "../modules/new-drop-batch"
import { ALERT_DISPATCH_MODULE } from "../modules/alert-dispatch"
import { INBOX_MODULE } from "../modules/inbox"
import { finalizeNewDropBatch } from "../workflows/manage-new-drop-batch"
import * as NewDropDigestTpl from "../emails/new-drop-digest"
import type { NewDropDigestProduct } from "../emails/new-drop-digest"
import { buildNewDropNarrative, type NarrativeItem } from "../lib/build-new-drop-narrative"
import type { AlertCategory } from "../lib/resolve-new-drop-recipients"

/** Recipients whose email fails this many times are terminally failed. */
export const EMAIL_ATTEMPT_CAP = 3
/** Per-run cap on recipients dispatched, across all in-flight batches. */
const BATCH_SIZE = 50

const ALL_CATEGORIES: AlertCategory[] = ["brewery_releases", "hop_alerts", "new_drops"]

type RecipientItem = {
  id: string
  recipient_id: string
  product_id: string
  kind: string
  category: AlertCategory
  channel_email: boolean
  channel_inapp: boolean
  alert_dispatch_id: string | null
  matched_brewery_names: string[] | null
  matched_hop_names: string[] | null
}

function toDigestProduct(
  item: NarrativeItem & { alert_dispatch_id?: string | null; hopTag?: string | null },
  productMap: Map<string, any>
): NewDropDigestProduct {
  const p = productMap.get(item.product_id)
  return {
    beerName: p?.title || "New release",
    breweryName: p?.metadata?.brewery_name || p?.metadata?.brewery || "",
    image: p?.thumbnail || null,
    handle: p?.handle || "",
    dispatchId: item.alert_dispatch_id ?? null,
    hopTag: item.hopTag ?? null,
  }
}

async function runDispatch(container: MedusaContainer) {
  const logger = container.resolve("logger") as any
  const batchService = container.resolve(NEW_DROP_BATCH_MODULE) as any
  const dispatchService = container.resolve(ALERT_DISPATCH_MODULE) as any
  const notificationService = container.resolve(INBOX_MODULE) as any
  const prefService = container.resolve("notificationPreference") as any
  const customerModule = container.resolve(Modules.CUSTOMER)
  const productModule = container.resolve(Modules.PRODUCT)
  const siteConfig = container.resolve("siteConfig") as any

  const batches = await batchService.listNewDropBatches({ status: "sending" })
  if (!batches.length) return

  await refreshEmailConfig(container)
  const storeUrl = getStoreUrl()

  const settings = await siteConfig.getMany([
    "alerts_max_per_day",
    "alerts_quiet_enabled",
    "alerts_quiet_from",
    "alerts_quiet_to",
    "alerts_quiet_tz",
  ])
  const now = new Date()
  const quiet = isQuietHours(now, {
    enabled: settings.alerts_quiet_enabled !== false,
    fromHour: Number(settings.alerts_quiet_from ?? 22),
    toHour: Number(settings.alerts_quiet_to ?? 8),
    tz: String(settings.alerts_quiet_tz ?? "Australia/Sydney"),
  })
  const maxPerDay = Number(settings.alerts_max_per_day ?? 3)
  const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  let dispatchedThisRun = 0
  const touchedBatchIds = new Set<string>()

  for (const batch of batches) {
    if (dispatchedThisRun >= BATCH_SIZE) break

    try {
      const pending = await batchService.listNewDropBatchRecipients({
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

      const recipientIds = recipientBatch.map((r: any) => r.id)
      const allItems: RecipientItem[] = recipientIds.length
        ? await batchService.listNewDropBatchRecipientItems({ recipient_id: recipientIds })
        : []
      const itemsByRecipient = new Map<string, RecipientItem[]>()
      for (const item of allItems) {
        const list = itemsByRecipient.get(item.recipient_id) ?? []
        list.push(item)
        itemsByRecipient.set(item.recipient_id, list)
      }

      const allProductIds = [...new Set(allItems.map((i) => i.product_id))]
      const products = allProductIds.length
        ? await productModule.listProducts(
            { id: allProductIds },
            { select: ["id", "title", "handle", "thumbnail", "metadata"] }
          )
        : []
      const productMap = new Map(products.map((p: any) => [p.id, p]))

      const deliveries = recipientIds.length
        ? await batchService.listNewDropEmailDeliveries({ recipient_id: recipientIds })
        : []
      const deliveriesByRecipient = new Map<string, any[]>()
      for (const d of deliveries) {
        const list = deliveriesByRecipient.get(d.recipient_id) ?? []
        list.push(d)
        deliveriesByRecipient.set(d.recipient_id, list)
      }

      for (const recipient of recipientBatch) {
        try {
          const [customer] = await customerModule.listCustomers({ id: recipient.customer_id })
          const items = itemsByRecipient.get(recipient.id) ?? []
          const recipientDeliveries = deliveriesByRecipient.get(recipient.id) ?? []

          if (!customer) {
            await batchService.updateNewDropBatchRecipients({
              id: recipient.id,
              dispatched_at: now,
            })
            const toSkip = recipientDeliveries.filter(
              (d) => d.status === "pending" || d.status === "retry"
            )
            await Promise.all(
              toSkip.map((d) =>
                batchService.updateNewDropEmailDeliveries({
                  id: d.id,
                  status: "skipped",
                  skip_reason: "customer_missing",
                })
              )
            )
            dispatchedThisRun++
            continue
          }

          // In-app: one consolidated notification, only if any matched item
          // actually wants the in-app channel.
          const wantsInapp = items.some((i) => i.channel_inapp)
          let inappSent = recipient.inapp_sent
          if (wantsInapp && !inappSent) {
            try {
              const productTitles = items
                .map((i) => (productMap.get(i.product_id) as any)?.title)
                .filter(Boolean)
              const body = describeDigest(productTitles)
              await notificationService.createNotifications({
                customer_id: recipient.customer_id,
                type: "new_drop",
                title: productTitles.length > 1 ? `${productTitles.length} new drops` : "New drop",
                body,
                metadata: { link_url: recipient.link_url, batch_id: batch.id },
              })
              inappSent = true
            } catch (inappErr) {
              logger.error(
                `[NewDropBatch] Inbox write failed for ${recipient.customer_id} (batch ${batch.id}): ${inappErr}`
              )
            }
          }

          // Email: one merged, personalized narrative per recipient. The
          // batch normally creates exactly one delivery per recipient, but
          // this loop stays defensive over multiple deliveries (e.g. any
          // left over from before the personalized-narrative change).
          let allEmailDone = true
          if (customer.email) {
            const emailItems = items.filter((i) => i.channel_email)
            const presentCategories = new Set<AlertCategory>(emailItems.map((i) => i.category))
            const optedInCategories = new Set<AlertCategory>()
            for (const category of ALL_CATEGORIES) {
              if (!presentCategories.has(category)) continue
              const optedIn = await prefService.isOptedIn(recipient.customer_id, category)
              if (optedIn) optedInCategories.add(category)
            }

            for (const delivery of recipientDeliveries) {
              if (
                delivery.status === "sent" ||
                delivery.status === "skipped" ||
                delivery.status === "failed"
              ) {
                continue
              }
              const dueNow = !delivery.next_attempt_at || new Date(delivery.next_attempt_at) <= now
              if (!dueNow) {
                allEmailDone = false
                continue
              }

              if (quiet) {
                allEmailDone = false
                continue
              }

              const sentInWindow = await countSentInWindow(
                dispatchService,
                recipient.customer_id,
                windowStart
              )
              if (exceedsThrottle(sentInWindow, maxPerDay)) {
                allEmailDone = false
                continue
              }

              const narrative = buildNewDropNarrative(
                emailItems.map((i) => ({
                  product_id: i.product_id,
                  category: i.category,
                  matched_brewery_names: i.matched_brewery_names ?? [],
                  matched_hop_names: i.matched_hop_names ?? [],
                  alert_dispatch_id: i.alert_dispatch_id,
                })),
                optedInCategories
              )

              if (!narrative.leadCategory) {
                await batchService.updateNewDropEmailDeliveries({
                  id: delivery.id,
                  status: "skipped",
                  skip_reason: "opted_out",
                })
                continue
              }

              const attempts = delivery.attempts + 1
              const includedItems = [
                ...(narrative.brewerySection?.items ?? []),
                ...(narrative.hopSection?.items ?? []),
                ...(narrative.generalSection?.items ?? []),
              ]

              const result = await sendTemplate({
                to: customer.email,
                customerId: customer.id,
                category: narrative.leadCategory,
                template: NewDropDigestTpl,
                props: {
                  name: customer.first_name || "Collector",
                  brewerySection: narrative.brewerySection
                    ? {
                        label: narrative.brewerySection.label,
                        products: narrative.brewerySection.items.map((i) =>
                          toDigestProduct(i, productMap)
                        ),
                      }
                    : null,
                  hopSection: narrative.hopSection
                    ? {
                        label: narrative.hopSection.label,
                        products: narrative.hopSection.items.map((i) =>
                          toDigestProduct(i, productMap)
                        ),
                      }
                    : null,
                  generalSection: narrative.generalSection
                    ? {
                        products: narrative.generalSection.items.map((i) =>
                          toDigestProduct(i, productMap)
                        ),
                      }
                    : null,
                  storeUrl,
                },
                container,
              })

              if (result.sent) {
                await batchService.updateNewDropEmailDeliveries({
                  id: delivery.id,
                  status: "sent",
                  attempts,
                  sent_at: now,
                })
                const dispatchIds = includedItems
                  .map((i) => i.alert_dispatch_id)
                  .filter(Boolean) as string[]
                await Promise.all(
                  dispatchIds.map((id) =>
                    dispatchService.updateAlertDispatches({
                      id,
                      email_sent: true,
                      dispatched_at: now,
                      email_delivery_id: delivery.id,
                    })
                  )
                )
              } else if (
                result.reason === "opted_out" ||
                result.reason === "customer_missing" ||
                result.reason === "no_resend_key"
              ) {
                await batchService.updateNewDropEmailDeliveries({
                  id: delivery.id,
                  status: "skipped",
                  attempts,
                  skip_reason: result.reason,
                })
              } else if (attempts >= EMAIL_ATTEMPT_CAP) {
                await batchService.updateNewDropEmailDeliveries({
                  id: delivery.id,
                  status: "failed",
                  attempts,
                  skip_reason: "email_failed_cap",
                  last_error: result.reason ?? "unknown",
                })
                allEmailDone = false
              } else {
                await batchService.updateNewDropEmailDeliveries({
                  id: delivery.id,
                  status: "retry",
                  attempts,
                  last_error: result.reason ?? "unknown",
                })
                allEmailDone = false
              }
            }
          } else {
            const undone = recipientDeliveries.filter(
              (d) => d.status === "pending" || d.status === "retry"
            )
            await Promise.all(
              undone.map((d) =>
                batchService.updateNewDropEmailDeliveries({
                  id: d.id,
                  status: "skipped",
                  skip_reason: "no_email",
                })
              )
            )
          }

          // Re-check terminal status for every delivery of this recipient
          // (not just the ones touched this tick) before deciding it's done.
          const refreshedDeliveries = recipientDeliveries.length
            ? await batchService.listNewDropEmailDeliveries({ recipient_id: recipient.id })
            : []
          const emailFullyDone = refreshedDeliveries.every((d: any) =>
            ["sent", "skipped", "failed"].includes(d.status)
          )
          const inappDone = !wantsInapp || inappSent

          await batchService.updateNewDropBatchRecipients({
            id: recipient.id,
            inapp_sent: inappSent,
            dispatched_at: inappDone && emailFullyDone ? now : null,
          })

          dispatchedThisRun++
        } catch (err) {
          logger.error(`[NewDropBatch] Failed dispatching recipient ${recipient.id}: ${err}`)
        }
      }
    } catch (err) {
      logger.error(`[NewDropBatch] Failed processing batch ${batch.id}: ${err}`)
      continue
    }
  }

  for (const batchId of touchedBatchIds) {
    const stillPending = await batchService.listNewDropBatchRecipients({
      batch_id: batchId,
      dispatched_at: null,
    })
    if (stillPending.length === 0) {
      await finalizeBatch(container, batchId)
    }
  }

  logger.info(`[NewDropBatch] Dispatch run complete: ${dispatchedThisRun} recipients processed`)
}

function describeDigest(productTitles: string[]): string {
  if (productTitles.length === 0) return "New drops just landed."
  if (productTitles.length === 1) return `${productTitles[0]} just dropped.`
  if (productTitles.length <= 3) return `${productTitles.join(", ")} just dropped.`
  return `${productTitles.slice(0, 2).join(", ")} and ${productTitles.length - 2} more just dropped.`
}

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

async function finalizeBatch(container: any, batchId: string) {
  const batchService = container.resolve(NEW_DROP_BATCH_MODULE) as any
  const recipients = await batchService.listNewDropBatchRecipients({ batch_id: batchId })
  const recipientIds = recipients.map((r: any) => r.id)
  const deliveries = recipientIds.length
    ? await batchService.listNewDropEmailDeliveries({ recipient_id: recipientIds })
    : []
  const hasFailed = deliveries.some((d: any) => d.status === "failed")
  await finalizeNewDropBatch(container, batchId, hasFailed ? "failed" : "sent")
}

export default async function newDropBatchDispatch(container: MedusaContainer) {
  const logger = container.resolve("logger") as any
  const outcome = await withJobLock(container, "new-drop-batch-dispatch", () =>
    runDispatch(container)
  )
  if (outcome.skipped) {
    logger.info("[NewDropBatch] Skipped tick - another run holds the dispatch lock")
  }
}

export const config = {
  name: "new-drop-batch-dispatch",
  schedule: "*/1 * * * *",
}
