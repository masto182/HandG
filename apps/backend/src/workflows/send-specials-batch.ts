import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { SPECIALS_BATCH_MODULE } from "../modules/specials-batch"
import { CAMPAIGN_MODULE } from "../modules/campaign"
import { resolveSegment, type BroadcastSegmentFilter } from "../lib/resolve-broadcast-segment"
import { computeDiscountedPrice } from "../lib/campaign-pricing"

export class ClaimConflictError extends Error {
  constructor(public unclaimedCampaignIds: string[]) {
    super("Some campaigns were already claimed by another batch")
    this.name = "ClaimConflictError"
  }
}

export class NoEligibleCampaignsError extends Error {
  constructor() {
    super("No campaigns to send - check status and product/price data")
    this.name = "NoEligibleCampaignsError"
  }
}

type CampaignSnapshotItem = {
  campaign_id: string
  product_id: string
  product_title: string
  product_handle: string
  product_thumbnail: string | null
  original_price: number
  discounted_price: number
  discount_type: "percentage" | "fixed"
  discount_value: number
}

/**
 * Atomically claims the given campaigns (batch_id IS NULL, active/scheduled)
 * for a brand new batch via a single conditional UPDATE ... RETURNING id.
 * Only one caller's UPDATE can match a given row - the CAS pattern that makes
 * double-click send and two concurrent admins picking overlapping campaigns
 * race-safe (mirrors claimQueueRows in manage-new-drop-batch.ts).
 */
async function claimCampaigns(
  container: any,
  campaignIds: string[],
  batchId: string
): Promise<string[]> {
  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const result = await knex.raw(
    `UPDATE special_campaign SET batch_id = ?, batched_at = now(), updated_at = now()
     WHERE id = ANY(?) AND batch_id IS NULL AND status IN ('active', 'scheduled') AND deleted_at IS NULL
     RETURNING id`,
    [batchId, campaignIds]
  )
  const rows = result?.rows ?? result?.[0] ?? []
  return rows.map((r: any) => r.id)
}

/**
 * Computes the AUD price + discount snapshot for every product on the given
 * campaigns, straight from the base variant price and the campaign's own
 * discount_type/discount_value - the same math activateCampaignStep uses to
 * build the price list. Deliberately does NOT read price_list_id: a
 * price-list lookup would go stale the moment campaign-lifecycle.ts expires
 * the campaign and deletes its price list mid-flight. This snapshot survives
 * that unaffected because it never looks at the campaign again after claim.
 */
async function snapshotCampaignItems(
  container: any,
  campaigns: any[]
): Promise<CampaignSnapshotItem[]> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as any
  const items: CampaignSnapshotItem[] = []

  for (const campaign of campaigns) {
    const productIds: string[] = campaign.target_product_ids || []
    if (!productIds.length) continue

    const { data: products } = await query.graph({
      entity: "product",
      filters: { id: productIds },
      fields: ["id", "title", "handle", "thumbnail", "variants.id", "variants.prices.*"],
    })

    for (const product of products) {
      let basePrice: number | null = null
      for (const variant of product.variants || []) {
        const audPrice = (variant.prices || []).find((p: any) => p.currency_code === "aud")
        if (audPrice) {
          basePrice = audPrice.amount
          break
        }
      }
      if (basePrice === null) continue

      const discountedPrice = computeDiscountedPrice(
        basePrice,
        campaign.discount_type,
        campaign.discount_value
      )

      items.push({
        campaign_id: campaign.id,
        product_id: product.id,
        product_title: product.title,
        product_handle: product.handle,
        product_thumbnail: product.thumbnail || null,
        original_price: Math.round(basePrice),
        discounted_price: discountedPrice,
        discount_type: campaign.discount_type,
        discount_value: campaign.discount_value,
      })
    }
  }

  return items
}

/** Preview-only: how many recipients + items a batch of these campaigns/segment would produce. */
export async function previewSpecialsBatch(
  container: any,
  campaignIds: string[],
  segmentFilter: BroadcastSegmentFilter
) {
  const campaignModule = container.resolve(CAMPAIGN_MODULE) as any
  const campaigns = await campaignModule.listSpecialCampaigns({ id: campaignIds })
  const items = await snapshotCampaignItems(container, campaigns)
  const recipientIds = await resolveSegment(container, segmentFilter)
  return {
    campaignCount: campaigns.length,
    itemCount: items.length,
    recipientCount: recipientIds.length,
  }
}

/**
 * Atomically claims the selected campaigns into a new batch, snapshots each
 * product's price/discount, resolves the recipient segment, and materializes
 * the delivery graph: one specials_batch_recipient per customer, one
 * specials_email_delivery per recipient. Throws ClaimConflictError or
 * NoEligibleCampaignsError on failure and cleans up anything already
 * created for this attempt.
 */
export async function sendSpecialsBatch(
  container: any,
  input: {
    campaign_ids: string[]
    segment_filter: BroadcastSegmentFilter
    label?: string | null
    created_by?: string | null
  }
) {
  const batchService = container.resolve(SPECIALS_BATCH_MODULE) as any
  const campaignModule = container.resolve(CAMPAIGN_MODULE) as any
  const campaignIds = [...new Set(input.campaign_ids)]

  const batch = await batchService.createSpecialsBatches({
    label: input.label ?? null,
    status: "sending",
    campaign_count: campaignIds.length,
    created_by: input.created_by ?? null,
  })

  let createdItemIds: string[] = []
  let createdRecipientIds: string[] = []
  let createdDeliveryIds: string[] = []

  try {
    const claimed = await claimCampaigns(container, campaignIds, batch.id)
    if (claimed.length !== campaignIds.length) {
      const unclaimed = campaignIds.filter((id) => !claimed.includes(id))
      throw new ClaimConflictError(unclaimed)
    }

    const campaigns = await campaignModule.listSpecialCampaigns({ id: claimed })
    const snapshotItems = await snapshotCampaignItems(container, campaigns)
    if (!snapshotItems.length) {
      throw new NoEligibleCampaignsError()
    }

    const createdItems = await batchService.createSpecialsBatchItems(
      snapshotItems.map((i) => ({ batch_id: batch.id, ...i }))
    )
    createdItemIds = createdItems.map((i: any) => i.id)

    const recipientIds = await resolveSegment(container, input.segment_filter)

    let recipientCount = 0
    for (const customerId of recipientIds) {
      const recipient = await batchService.createSpecialsBatchRecipients({
        batch_id: batch.id,
        customer_id: customerId,
        inapp_sent: false,
        dispatched_at: null,
      })
      createdRecipientIds.push(recipient.id)

      const delivery = await batchService.createSpecialsEmailDeliveries({
        recipient_id: recipient.id,
        status: "pending",
      })
      createdDeliveryIds.push(delivery.id)
      recipientCount++
    }

    await batchService.updateSpecialsBatches({
      id: batch.id,
      recipient_count: recipientCount,
    })

    if (recipientCount === 0) {
      await finalizeSpecialsBatch(container, batch.id, "sent")
    }

    const finalBatch = await batchService.retrieveSpecialsBatch(batch.id)
    return { batch: finalBatch }
  } catch (err) {
    if (createdDeliveryIds.length) {
      await batchService.deleteSpecialsEmailDeliveries(createdDeliveryIds).catch(() => {})
    }
    if (createdRecipientIds.length) {
      await batchService.deleteSpecialsBatchRecipients(createdRecipientIds).catch(() => {})
    }
    if (createdItemIds.length) {
      await batchService.deleteSpecialsBatchItems(createdItemIds).catch(() => {})
    }
    await campaignModule
      .updateSpecialCampaigns({
        selector: { batch_id: batch.id },
        data: { batch_id: null, batched_at: null },
      })
      .catch(() => {})
    await batchService.deleteSpecialsBatches(batch.id).catch(() => {})
    throw err
  }
}

export async function finalizeSpecialsBatch(
  container: any,
  batchId: string,
  status: "sent" | "failed"
) {
  const batchService = container.resolve(SPECIALS_BATCH_MODULE) as any
  await batchService.updateSpecialsBatches({
    id: batchId,
    status,
    sent_at: new Date(),
  })
}

/**
 * Resets terminally-failed email deliveries on a failed batch back to
 * pending (never touches already-sent deliveries), and flips the batch back
 * to 'sending' so the dispatch job picks it up again next tick.
 */
export async function retryFailedSpecialsBatch(container: any, batchId: string) {
  const batchService = container.resolve(SPECIALS_BATCH_MODULE) as any
  const batch = await batchService.retrieveSpecialsBatch(batchId)

  const recipients = await batchService.listSpecialsBatchRecipients({ batch_id: batchId })
  const recipientIds = recipients.map((r: any) => r.id)
  if (!recipientIds.length) return batch

  const failedDeliveries = await batchService.listSpecialsEmailDeliveries({
    recipient_id: recipientIds,
    status: "failed",
  })
  if (failedDeliveries.length) {
    await Promise.all(
      failedDeliveries.map((d: any) =>
        batchService.updateSpecialsEmailDeliveries({
          id: d.id,
          status: "pending",
          next_attempt_at: null,
          last_error: null,
        })
      )
    )
  }

  return batchService.updateSpecialsBatches({
    id: batchId,
    status: "sending",
    failed_count: 0,
  })
}
