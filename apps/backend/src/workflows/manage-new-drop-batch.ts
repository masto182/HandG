import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { NEW_DROP_BATCH_MODULE } from "../modules/new-drop-batch"
import { ALERT_DISPATCH_MODULE } from "../modules/alert-dispatch"
import { assessNewDropReadinessBatch, type ReadinessResult } from "../lib/assess-new-drop-readiness"
import { resolveRecipientsForProduct, type AlertCategory } from "../lib/resolve-new-drop-recipients"
import { buildNewDropNarrative, type NarrativeItem } from "../lib/build-new-drop-narrative"
import { renderEmail } from "../lib/render-email"
import { getStoreUrl } from "../lib/email"
import * as NewDropDigestTpl from "../emails/new-drop-digest"
import type { NewDropDigestProduct } from "../emails/new-drop-digest"

/**
 * Section-placement priority for picking a recipient's SINGLE lead category
 * (used for the one email_delivery per recipient) - brewery leads, hop is
 * secondary, all_new is the generic fallback. Mirrors KIND_RANK in
 * resolve-new-drop-recipients.ts.
 */
const CATEGORY_RANK: Record<AlertCategory, number> = {
  brewery_releases: 3,
  hop_alerts: 2,
  new_drops: 1,
}

export class ReadinessBlockedError extends Error {
  constructor(public blockers: Record<string, ReadinessResult>) {
    super("One or more products are not ready to send")
    this.name = "ReadinessBlockedError"
  }
}

export class ClaimConflictError extends Error {
  constructor(public unclaimedProductIds: string[]) {
    super("Some products were already claimed by another batch")
    this.name = "ClaimConflictError"
  }
}

function buildStoreLink(breweryNames: string[]): string {
  const params = new URLSearchParams()
  if (breweryNames.length) {
    params.set("brewery", breweryNames.join(","))
  }
  params.set("sortBy", "created_at")
  return `/store?${params.toString()}`
}

/**
 * Flips a batch to its terminal status and marks every 'batched' queue row
 * tied to it as 'sent' - the batch is the unit of success/failure here, not
 * individual products, matching the plan's model (no per-product batch
 * status).
 */
export async function finalizeNewDropBatch(
  container: any,
  batchId: string,
  status: "sent" | "failed"
) {
  const batchService = container.resolve(NEW_DROP_BATCH_MODULE) as any
  await batchService.updateNewDropBatches({
    id: batchId,
    status,
    sent_at: new Date(),
  })
  const queueRows = await batchService.listNewDropQueues({ batch_id: batchId })
  await Promise.all(
    queueRows.map((q: any) => batchService.updateNewDropQueues({ id: q.id, status: "sent" }))
  )
}

/**
 * Atomically claims the given queue rows (pending -> batched) for a brand
 * new batch, via a single conditional UPDATE ... WHERE status = 'pending'
 * RETURNING id. This is what makes double-click send and two concurrent
 * admins picking overlapping products race-safe: only one caller's UPDATE
 * can match a given row, the other gets it back unclaimed.
 */
async function claimQueueRows(
  container: any,
  productIds: string[],
  batchId: string
): Promise<string[]> {
  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const result = await knex.raw(
    `UPDATE new_drop_queue SET status = 'batched', batch_id = ?, updated_at = now()
     WHERE product_id = ANY(?) AND status = 'pending' AND deleted_at IS NULL
     RETURNING product_id`,
    [batchId, productIds]
  )
  const rows = result?.rows ?? result?.[0] ?? []
  return rows.map((r: any) => r.product_id)
}

export type PreviewRecipient = {
  customer_id: string
  customerLabel: string
  leadCategory: AlertCategory | null
  matchedBreweryNames: string[]
  matchedHopNames: string[]
  wantsInbox: boolean
  wantsEmail: boolean
  preferences: { category: AlertCategory; enabled: boolean }[]
}

/**
 * Preview-only aggregation: how many customers/emails/inbox rows a batch of
 * these products would produce, plus a lightweight per-recipient list (no
 * HTML rendering - that's the on-demand preview-render endpoint) so the
 * operator can browse real matched customers and their actual preferences
 * before sending. Used by the preview route AND re-run inside
 * sendNewDropBatch immediately before commit, since recipient state can
 * move between preview and send.
 */
export async function previewNewDropBatch(container: any, productIds: string[]) {
  const readinessMap = await assessNewDropReadinessBatch(container, productIds)
  const readiness: Record<string, ReadinessResult> = {}
  const blockedProductIds: string[] = []
  readinessMap.forEach((r, id) => {
    readiness[id] = r
    if (r.blockers.length) blockedProductIds.push(id)
  })

  const breweryNameSet = new Set<string>()
  type CustomerAccum = {
    items: Array<{ category: AlertCategory; breweryNames: string[]; hopNames: string[] }>
    wantsInbox: boolean
    wantsEmail: boolean
  }
  const byCustomer = new Map<string, CustomerAccum>()

  for (const productId of productIds) {
    const { recipients, breweryNames } = await resolveRecipientsForProduct(container, productId)
    breweryNames.forEach((n) => breweryNameSet.add(n))
    for (const r of recipients) {
      if (!r.want_email && !r.want_inapp) continue
      let acc = byCustomer.get(r.customer_id)
      if (!acc) {
        acc = { items: [], wantsInbox: false, wantsEmail: false }
        byCustomer.set(r.customer_id, acc)
      }
      if (r.want_inapp) acc.wantsInbox = true
      if (r.want_email) {
        acc.wantsEmail = true
        acc.items.push({ category: r.category, breweryNames: r.breweryNames, hopNames: r.hopNames })
      }
    }
  }

  const customerModule = container.resolve(Modules.CUSTOMER) as any
  const prefService = container.resolve("notificationPreference") as any

  const recipientsByLeadCategory: Record<AlertCategory, number> = {
    hop_alerts: 0,
    brewery_releases: 0,
    new_drops: 0,
  }
  const previewRecipients: PreviewRecipient[] = []

  for (const [customerId, acc] of byCustomer) {
    let leadCategory: AlertCategory | null = null
    const matchedBreweryNames = new Set<string>()
    const matchedHopNames = new Set<string>()
    for (const item of acc.items) {
      item.breweryNames.forEach((n) => matchedBreweryNames.add(n))
      item.hopNames.forEach((n) => matchedHopNames.add(n))
      if (!leadCategory || CATEGORY_RANK[item.category] > CATEGORY_RANK[leadCategory]) {
        leadCategory = item.category
      }
    }
    if (leadCategory) recipientsByLeadCategory[leadCategory]++

    const [customer] = await customerModule.listCustomers({ id: customerId })
    const customerLabel =
      customer?.email ||
      [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ||
      customerId
    const allPreferences = await prefService.listForCustomer(customerId)
    const preferences = (allPreferences as any[])
      .filter((p) => ["brewery_releases", "hop_alerts", "new_drops"].includes(p.category))
      .map((p) => ({ category: p.category as AlertCategory, enabled: p.enabled }))

    previewRecipients.push({
      customer_id: customerId,
      customerLabel,
      leadCategory,
      matchedBreweryNames: [...matchedBreweryNames],
      matchedHopNames: [...matchedHopNames],
      wantsInbox: acc.wantsInbox,
      wantsEmail: acc.wantsEmail,
      preferences,
    })
  }

  const allCustomers = new Set<string>(byCustomer.keys())

  return {
    productCount: productIds.length,
    breweryNames: [...breweryNameSet],
    readiness,
    blockedProductIds,
    uniqueCustomerCount: allCustomers.size,
    inboxCount: previewRecipients.filter((r) => r.wantsInbox).length,
    recipientsByLeadCategory,
    zeroRecipients: allCustomers.size === 0,
    recipients: previewRecipients,
  }
}

/**
 * Atomically claims the selected queue rows into a new batch, resolves
 * recipients per product, and materializes the full delivery graph:
 * one new_drop_batch_recipient per customer, one recipient_item per
 * (customer, product), one alert_dispatch per (customer, product) created
 * with email_sent=false/dispatched_at=null (truthful until the dispatch job
 * confirms an actual send), and one new_drop_email_delivery per
 * (customer, category) actually needed.
 *
 * Throws ReadinessBlockedError or ClaimConflictError on failure and cleans
 * up anything it already created for this attempt - callers should map
 * both to HTTP 409 and ask the caller to re-preview.
 */
export async function sendNewDropBatch(
  container: any,
  input: {
    product_ids: string[]
    label?: string | null
    created_by?: string | null
    excluded_customer_ids?: string[]
  }
) {
  const batchService = container.resolve(NEW_DROP_BATCH_MODULE) as any
  const dispatchService = container.resolve(ALERT_DISPATCH_MODULE) as any
  const productIds = [...new Set(input.product_ids)]
  const excludedCustomerIds = new Set(input.excluded_customer_ids ?? [])

  const readinessMap = await assessNewDropReadinessBatch(container, productIds)
  const blockers: Record<string, ReadinessResult> = {}
  readinessMap.forEach((r, id) => {
    if (r.blockers.length) blockers[id] = r
  })
  if (Object.keys(blockers).length > 0) {
    throw new ReadinessBlockedError(blockers)
  }

  const batch = await batchService.createNewDropBatches({
    label: input.label ?? null,
    status: "sending",
    product_count: productIds.length,
    created_by: input.created_by ?? null,
  })

  let createdRecipientIds: string[] = []
  let createdItemIds: string[] = []
  let createdDeliveryIds: string[] = []
  let createdDispatchIds: string[] = []

  try {
    const claimed = await claimQueueRows(container, productIds, batch.id)
    if (claimed.length !== productIds.length) {
      const unclaimed = productIds.filter((id) => !claimed.includes(id))
      throw new ClaimConflictError(unclaimed)
    }

    await batchService.createNewDropBatchItems(
      productIds.map((product_id) => ({ batch_id: batch.id, product_id }))
    )

    type ItemMatch = {
      product_id: string
      kind: string
      category: AlertCategory
      channel_email: boolean
      channel_inapp: boolean
      breweryNames: string[]
      hopNames: string[]
    }
    const byCustomer = new Map<string, ItemMatch[]>()

    for (const productId of productIds) {
      const { recipients } = await resolveRecipientsForProduct(container, productId)
      for (const r of recipients) {
        if (!r.want_email && !r.want_inapp) continue
        if (excludedCustomerIds.has(r.customer_id)) continue
        const list = byCustomer.get(r.customer_id) ?? []
        list.push({
          product_id: productId,
          kind: r.kind,
          category: r.category,
          channel_email: r.want_email,
          channel_inapp: r.want_inapp,
          breweryNames: r.breweryNames,
          hopNames: r.hopNames,
        })
        byCustomer.set(r.customer_id, list)
      }
    }

    let recipientCount = 0
    let deliveryCount = 0

    for (const [customerId, items] of byCustomer) {
      const breweryNamesForCustomer = new Set<string>()
      for (const item of items) {
        item.breweryNames.forEach((n) => breweryNamesForCustomer.add(n))
      }
      const linkUrl = buildStoreLink([...breweryNamesForCustomer])

      const recipient = await batchService.createNewDropBatchRecipients({
        batch_id: batch.id,
        customer_id: customerId,
        link_url: linkUrl,
        inapp_sent: false,
        dispatched_at: null,
      })
      createdRecipientIds.push(recipient.id)
      recipientCount++

      let leadCategory: AlertCategory | null = null

      for (const item of items) {
        const dispatch = await dispatchService.createAlertDispatches({
          customer_id: customerId,
          product_id: item.product_id,
          kind: item.kind,
          channel_email: item.channel_email,
          channel_inapp: item.channel_inapp,
          email_sent: false,
          dispatched_at: null,
        })
        createdDispatchIds.push(dispatch.id)

        const recipientItem = await batchService.createNewDropBatchRecipientItems({
          recipient_id: recipient.id,
          product_id: item.product_id,
          kind: item.kind,
          category: item.category,
          channel_email: item.channel_email,
          channel_inapp: item.channel_inapp,
          alert_dispatch_id: dispatch.id,
          matched_brewery_names: item.breweryNames,
          matched_hop_names: item.hopNames,
        })
        createdItemIds.push(recipientItem.id)

        if (
          item.channel_email &&
          (!leadCategory || CATEGORY_RANK[item.category] > CATEGORY_RANK[leadCategory])
        ) {
          leadCategory = item.category
        }
      }

      // One email_delivery per recipient per batch (not per category) - the
      // personalized-narrative follow-up merges every matched category into
      // a single email, led by `leadCategory` and with lower-priority
      // categories rendered as secondary sections by the dispatch job.
      if (leadCategory) {
        const delivery = await batchService.createNewDropEmailDeliveries({
          recipient_id: recipient.id,
          category: leadCategory,
          status: "pending",
        })
        createdDeliveryIds.push(delivery.id)
        deliveryCount++
      }
    }

    await batchService.updateNewDropBatches({
      id: batch.id,
      recipient_count: recipientCount,
      email_delivery_count: deliveryCount,
    })

    if (recipientCount === 0) {
      await finalizeNewDropBatch(container, batch.id, "sent")
    }

    const finalBatch = await batchService.retrieveNewDropBatch(batch.id)
    return { batch: finalBatch }
  } catch (err) {
    // Best-effort cleanup of everything created in this attempt, then
    // revert the batch and any claimed queue rows so the products go back
    // to pending and can be retried in a fresh batch.
    if (createdDeliveryIds.length) {
      await batchService.deleteNewDropEmailDeliveries(createdDeliveryIds).catch(() => {})
    }
    if (createdItemIds.length) {
      await batchService.deleteNewDropBatchRecipientItems(createdItemIds).catch(() => {})
    }
    if (createdDispatchIds.length) {
      await dispatchService.deleteAlertDispatches(createdDispatchIds).catch(() => {})
    }
    if (createdRecipientIds.length) {
      await batchService.deleteNewDropBatchRecipients(createdRecipientIds).catch(() => {})
    }
    const queueRows = await batchService.listNewDropQueues({ batch_id: batch.id }).catch(() => [])
    await Promise.all(
      queueRows.map((q: any) =>
        batchService
          .updateNewDropQueues({ id: q.id, status: "pending", batch_id: null })
          .catch(() => {})
      )
    )
    await batchService.deleteNewDropBatches(batch.id).catch(() => {})
    throw err
  }
}

/**
 * Resets terminally-failed email deliveries on a failed batch back to
 * pending (never touches already-sent deliveries), and flips the batch back
 * to 'sending' so the dispatch job picks it up again next tick.
 */
export async function retryFailedNewDropBatch(container: any, batchId: string) {
  const batchService = container.resolve(NEW_DROP_BATCH_MODULE) as any
  const batch = await batchService.retrieveNewDropBatch(batchId)

  const recipients = await batchService.listNewDropBatchRecipients({
    batch_id: batchId,
  })
  const recipientIds = recipients.map((r: any) => r.id)
  if (!recipientIds.length) return batch

  const failedDeliveries = await batchService.listNewDropEmailDeliveries({
    recipient_id: recipientIds,
    status: "failed",
  })
  if (failedDeliveries.length) {
    await Promise.all(
      failedDeliveries.map((d: any) =>
        batchService.updateNewDropEmailDeliveries({
          id: d.id,
          status: "pending",
          next_attempt_at: null,
          last_error: null,
        })
      )
    )
  }

  return batchService.updateNewDropBatches({
    id: batchId,
    status: "sending",
    failed_count: 0,
  })
}

function toDigestProduct(
  item: NarrativeItem & { hopTag?: string | null },
  productMap: Map<string, any>
): NewDropDigestProduct {
  const p = productMap.get(item.product_id)
  return {
    beerName: p?.title || "New release",
    breweryName: p?.metadata?.brewery_name || p?.metadata?.brewery || "",
    image: p?.thumbnail || null,
    handle: p?.handle || "",
    dispatchId: null,
    hopTag: item.hopTag ?? null,
  }
}

/**
 * Renders (but never sends or persists) the actual email a given customer
 * would receive for this set of products - or, when `customerId` is
 * omitted, the generic email everyone else would receive. Used by the
 * Review & Send preview UI so the operator can inspect real recipients'
 * emails before committing to a send. Fully read-only.
 */
export async function renderNewDropPreview(
  container: any,
  productIds: string[],
  customerId: string | null
): Promise<{ html: string; subject: string; leadCategory: AlertCategory | null }> {
  const productModule = container.resolve(Modules.PRODUCT) as any
  const products = await productModule.listProducts(
    { id: productIds },
    { select: ["id", "title", "handle", "thumbnail", "metadata"] }
  )
  const productMap = new Map<string, any>(products.map((p: any) => [p.id, p]))

  if (!customerId) {
    // Generic variant: a customer with only the blanket new-drops opt-in
    // sees every product in the batch, no brewery/hop reasoning attached.
    const generalSection = {
      products: productIds.map((id) =>
        toDigestProduct(
          {
            product_id: id,
            category: "new_drops",
            matched_brewery_names: [],
            matched_hop_names: [],
          },
          productMap
        )
      ),
    }
    const props = {
      name: "Collector",
      brewerySection: null,
      hopSection: null,
      generalSection,
      storeUrl: getStoreUrl(),
    }
    const rendered = await renderEmail(NewDropDigestTpl as any, props)
    return { html: rendered.html, subject: rendered.subject, leadCategory: "new_drops" }
  }

  const items: Array<NarrativeItem> = []
  for (const productId of productIds) {
    const { recipients } = await resolveRecipientsForProduct(container, productId)
    const match = recipients.find((r) => r.customer_id === customerId)
    if (!match || !match.want_email) continue
    items.push({
      product_id: productId,
      category: match.category,
      matched_brewery_names: match.breweryNames,
      matched_hop_names: match.hopNames,
    })
  }

  const prefService = container.resolve("notificationPreference") as any
  const presentCategories = new Set(items.map((i) => i.category))
  const optedInCategories = new Set<AlertCategory>()
  for (const category of presentCategories) {
    const optedIn = await prefService.isOptedIn(customerId, category)
    if (optedIn) optedInCategories.add(category)
  }

  const narrative = buildNewDropNarrative(items, optedInCategories)
  const customerModule = container.resolve(Modules.CUSTOMER) as any
  const [customer] = await customerModule.listCustomers({ id: customerId })

  const props = {
    name: customer?.first_name || "Collector",
    brewerySection: narrative.brewerySection
      ? {
          label: narrative.brewerySection.label,
          products: narrative.brewerySection.items.map((i) => toDigestProduct(i, productMap)),
        }
      : null,
    hopSection: narrative.hopSection
      ? {
          label: narrative.hopSection.label,
          products: narrative.hopSection.items.map((i) => toDigestProduct(i, productMap)),
        }
      : null,
    generalSection: narrative.generalSection
      ? { products: narrative.generalSection.items.map((i) => toDigestProduct(i, productMap)) }
      : null,
    storeUrl: getStoreUrl(),
  }
  const rendered = await renderEmail(NewDropDigestTpl as any, props)
  return { html: rendered.html, subject: rendered.subject, leadCategory: narrative.leadCategory }
}
