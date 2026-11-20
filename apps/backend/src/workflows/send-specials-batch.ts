import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { SPECIALS_BATCH_MODULE } from "../modules/specials-batch"
import { resolveSegment } from "../lib/resolve-broadcast-segment"
import { renderEmail } from "../lib/render-email"
import { getStoreUrl } from "../lib/email"
import * as SpecialsBroadcastTpl from "../emails/specials-broadcast"
import { ANALYTICS_MODULE } from "../modules/analytics"

export class NoActiveSpecialsError extends Error {
  constructor() {
    super("Nothing is currently on special")
    this.name = "NoActiveSpecialsError"
  }
}

export class SendInProgressError extends Error {
  constructor() {
    super("A specials batch is already sending - wait for it to finish before sending another")
    this.name = "SendInProgressError"
  }
}

export class SelectedSpecialsUnavailableError extends Error {
  constructor(public productIds: string[]) {
    super("Some selected specials are no longer active - refresh and try again")
    this.name = "SelectedSpecialsUnavailableError"
  }
}

export type SpecialsSnapshotItem = {
  price_list_id: string
  product_id: string
  product_title: string
  product_handle: string
  product_thumbnail: string | null
  original_price: number
  discounted_price: number
  discount_type: "percentage" | "fixed"
  discount_value: number
}

export type EligibleSpecialsItem = SpecialsSnapshotItem & {
  brewery_id: string | null
  brewery_name: string | null
}

export type SpecialsRecipient = {
  customer_id: string
  label: string
  has_logged_in: boolean
  has_ordered: boolean
  is_active: boolean
  opted_out: boolean
}

const CUSTOMER_PAGE_SIZE = 1000

function normalizeSubject(subject?: string | null): string | null {
  const trimmed = subject?.trim()
  return trimmed ? trimmed : null
}

function selectEligibleSpecialsItems(
  eligibleItems: EligibleSpecialsItem[],
  productIds: string[]
): { selectedItems: EligibleSpecialsItem[]; unavailableProductIds: string[] } {
  const uniqueProductIds = [...new Set(productIds.filter(Boolean))]
  const byProductId = new Map(eligibleItems.map((item) => [item.product_id, item]))
  const selectedItems = uniqueProductIds
    .map((productId) => byProductId.get(productId) ?? null)
    .filter((item): item is EligibleSpecialsItem => !!item)
  const unavailableProductIds = uniqueProductIds.filter((productId) => !byProductId.has(productId))
  return { selectedItems, unavailableProductIds }
}

async function listCustomersById(container: any, customerIds: string[]) {
  const customerModule = container.resolve(Modules.CUSTOMER) as any
  const customers: any[] = []
  for (let index = 0; index < customerIds.length; index += CUSTOMER_PAGE_SIZE) {
    const pageIds = customerIds.slice(index, index + CUSTOMER_PAGE_SIZE)
    if (!pageIds.length) continue
    const page = await customerModule.listCustomers(
      { id: pageIds },
      { select: ["id", "email", "first_name", "last_name"] }
    )
    customers.push(...page)
  }
  return customers
}

/**
 * Every product currently covered by an active Medusa "sale" price list -
 * the real, already-in-use mechanism this store discounts products with
 * (see src/scripts/import-us-beers.ts, src/api/admin/stock-import/route.ts,
 * and manage-campaign.ts's activateCampaignStep - all three create plain
 * `type: "sale"` price lists rather than anything specials-batch-specific).
 * One row per (sale price row, base price row) pair sharing a price_set;
 * dedupes to the best (lowest) discounted price per product if more than
 * one sale price list somehow targets the same product. Skips rows with
 * no AUD base price to compare against, where the "sale" price isn't
 * actually lower than the base price, an unpublished product, or a
 * sold-out variant (available_quantity summed across all stock locations
 * <= 0 - variants with manage_inventory off are always treated as
 * available, matching storefront stock-check semantics).
 */
export async function listEligibleSpecialsItems(container: any): Promise<EligibleSpecialsItem[]> {
  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const result = await knex.raw(
    `SELECT sale.price_list_id, sale.amount AS sale_amount, base.amount AS base_amount,
            p.id AS product_id, p.title AS product_title, p.handle AS product_handle,
            p.thumbnail AS product_thumbnail
     FROM price_list pl
     JOIN price sale ON sale.price_list_id = pl.id AND sale.currency_code = 'aud' AND sale.deleted_at IS NULL
     JOIN product_variant_price_set pvps ON pvps.price_set_id = sale.price_set_id AND pvps.deleted_at IS NULL
     JOIN product_variant pv ON pv.id = pvps.variant_id AND pv.deleted_at IS NULL
     JOIN product p ON p.id = pv.product_id AND p.deleted_at IS NULL
     LEFT JOIN price base ON base.price_set_id = sale.price_set_id AND base.price_list_id IS NULL
       AND base.currency_code = 'aud' AND base.deleted_at IS NULL
     WHERE pl.type = 'sale' AND pl.status = 'active' AND pl.deleted_at IS NULL
       AND (pl.starts_at IS NULL OR pl.starts_at <= now())
       AND (pl.ends_at IS NULL OR pl.ends_at >= now())
       AND p.status = 'published'
       AND (
         pv.manage_inventory = false
         OR COALESCE((
           SELECT SUM(il.stocked_quantity - il.reserved_quantity)
           FROM product_variant_inventory_item pvii
           JOIN inventory_level il ON il.inventory_item_id = pvii.inventory_item_id AND il.deleted_at IS NULL
           WHERE pvii.variant_id = pv.id AND pvii.deleted_at IS NULL
         ), 0) > 0
       )`
  )
  const rows = result?.rows ?? result?.[0] ?? []

  const byProduct = new Map<string, SpecialsSnapshotItem>()
  for (const row of rows) {
    const basePrice = row.base_amount === null ? null : Number(row.base_amount)
    const salePrice = Number(row.sale_amount)
    if (basePrice === null || basePrice <= 0 || salePrice >= basePrice) continue

    const discountValue = Math.round((1 - salePrice / basePrice) * 100)
    const existing = byProduct.get(row.product_id)
    if (existing && existing.discounted_price <= salePrice) continue

    byProduct.set(row.product_id, {
      price_list_id: row.price_list_id,
      product_id: row.product_id,
      product_title: row.product_title,
      product_handle: row.product_handle,
      product_thumbnail: row.product_thumbnail || null,
      original_price: basePrice,
      discounted_price: salePrice,
      discount_type: "percentage",
      discount_value: discountValue,
    })
  }

  const items = [...byProduct.values()]
  if (!items.length) return []

  const query = container.resolve(ContainerRegistrationKeys.QUERY) as any
  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "metadata", "breweries.id", "breweries.name", "breweries.slug"],
    filters: { id: items.map((item) => item.product_id) },
  })

  const breweryInfoByProductId = new Map<
    string,
    { brewery_id: string | null; brewery_name: string | null }
  >()
  for (const product of (data ?? []) as any[]) {
    const metadata = product?.metadata ?? {}
    const metadataBrewerySlug = metadata?.brewery_slug || null
    const metadataBreweryName = metadata?.brewery_name || metadata?.brewery || null
    const breweries = (product?.breweries || []).filter((brewery: any) => brewery?.id)
    const primaryBrewery =
      breweries.find(
        (brewery: any) => metadataBrewerySlug && brewery.slug === metadataBrewerySlug
      ) ||
      breweries[0] ||
      null

    breweryInfoByProductId.set(product.id, {
      brewery_id: primaryBrewery?.id ?? null,
      brewery_name: primaryBrewery?.name || metadataBreweryName,
    })
  }

  return items.map((item) => ({
    ...item,
    brewery_id: breweryInfoByProductId.get(item.product_id)?.brewery_id ?? null,
    brewery_name: breweryInfoByProductId.get(item.product_id)?.brewery_name ?? null,
  }))
}

export async function listSpecialsRecipients(container: any): Promise<SpecialsRecipient[]> {
  const logger = container.resolve("logger") as any
  const prefService = container.resolve("notificationPreference") as any
  const customerIds = await resolveSegment(container, {})
  const [orderedCustomerIds, optedOutRows, customers] = await Promise.all([
    resolveSegment(container, { has_ordered: true }),
    prefService.listNotificationPreferences({ category: "specials", enabled: false }),
    listCustomersById(container, customerIds),
  ])

  let lastActiveByCustomerId = new Map<string, string>()
  try {
    const analytics = container.resolve(ANALYTICS_MODULE) as any
    lastActiveByCustomerId = await analytics.getLastActiveByCustomerIds(customerIds)
  } catch (err) {
    logger?.warn?.(`[SpecialsBatch] login lookup failed: ${err}`)
  }

  const orderedCustomerIdSet = new Set(orderedCustomerIds)
  const optedOutCustomerIdSet = new Set((optedOutRows as any[]).map((row) => row.customer_id))
  const customerById = new Map(customers.map((customer: any) => [customer.id, customer]))

  return customerIds.map((customerId) => {
    const customer = customerById.get(customerId)
    const label =
      customer?.email ||
      [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ||
      customerId
    const hasLoggedIn = lastActiveByCustomerId.has(customerId)
    const hasOrdered = orderedCustomerIdSet.has(customerId)
    return {
      customer_id: customerId,
      label,
      has_logged_in: hasLoggedIn,
      has_ordered: hasOrdered,
      is_active: hasLoggedIn || hasOrdered,
      opted_out: optedOutCustomerIdSet.has(customerId),
    }
  })
}

/**
 * Renders (never sends or persists) the exact email a "send to everyone"
 * click would produce right now, using every currently-active special -
 * same auto-selection and same in-template featured-item cap the real send
 * uses. Read-only, callable as many times as the operator wants.
 */
export async function renderSpecialsPreview(
  container: any,
  input: { productIds: string[]; message?: string | null; subject?: string | null }
) {
  const eligibleItems = await listEligibleSpecialsItems(container)
  if (!eligibleItems.length || input.productIds.length === 0) {
    throw new NoActiveSpecialsError()
  }

  const { selectedItems, unavailableProductIds } = selectEligibleSpecialsItems(
    eligibleItems,
    input.productIds
  )
  if (unavailableProductIds.length) {
    throw new SelectedSpecialsUnavailableError(unavailableProductIds)
  }
  if (!selectedItems.length) {
    throw new NoActiveSpecialsError()
  }

  return renderEmail(SpecialsBroadcastTpl as any, {
    name: "Collector",
    message: input.message ?? null,
    subjectOverride: normalizeSubject(input.subject),
    items: selectedItems.map((i) => ({
      productTitle: i.product_title,
      productHandle: i.product_handle,
      productThumbnail: i.product_thumbnail,
      originalPrice: i.original_price,
      discountedPrice: i.discounted_price,
      discountType: i.discount_type,
      discountValue: i.discount_value,
    })),
    storeUrl: getStoreUrl(),
  })
}

/**
 * Snapshots every product currently on a "sale" price list, resolves every
 * customer (no segment - a specials send always goes to everyone, gated
 * only by the "specials" opt-out preference at send time), and materializes
 * the delivery graph: one specials_batch_recipient + specials_email_delivery
 * per customer. Throws NoActiveSpecialsError if nothing is on special, or
 * SendInProgressError if a previous batch is still sending.
 */
export async function sendSpecialsBatch(
  container: any,
  input: {
    product_ids: string[]
    label?: string | null
    message?: string | null
    subject?: string | null
    created_by?: string | null
    excluded_customer_ids?: string[]
  }
) {
  const batchService = container.resolve(SPECIALS_BATCH_MODULE) as any
  const productIds = [...new Set((input.product_ids ?? []).filter(Boolean))]
  const excludedCustomerIds = new Set(input.excluded_customer_ids ?? [])

  const [sending] = await batchService.listSpecialsBatches({ status: "sending" })
  if (sending) {
    throw new SendInProgressError()
  }

  const eligibleItems = await listEligibleSpecialsItems(container)
  if (!eligibleItems.length || !productIds.length) {
    throw new NoActiveSpecialsError()
  }

  const { selectedItems, unavailableProductIds } = selectEligibleSpecialsItems(
    eligibleItems,
    productIds
  )
  if (unavailableProductIds.length) {
    throw new SelectedSpecialsUnavailableError(unavailableProductIds)
  }
  if (!selectedItems.length) {
    throw new NoActiveSpecialsError()
  }

  const subject = normalizeSubject(input.subject)

  const batch = await batchService.createSpecialsBatches({
    label: input.label ?? null,
    message: input.message ?? null,
    subject,
    status: "sending",
    product_count: selectedItems.length,
    created_by: input.created_by ?? null,
  })

  let createdItemIds: string[] = []
  let createdRecipientIds: string[] = []
  let createdDeliveryIds: string[] = []

  try {
    const createdItems = await batchService.createSpecialsBatchItems(
      selectedItems.map(({ brewery_id, brewery_name, ...snapshotItem }) => ({
        batch_id: batch.id,
        ...snapshotItem,
      }))
    )
    createdItemIds = createdItems.map((i: any) => i.id)

    const recipientIds = (await resolveSegment(container, {})).filter(
      (customerId) => !excludedCustomerIds.has(customerId)
    )

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
 * pending (never touches already-sent deliveries) with a fresh attempt
 * budget, clears dispatched_at on their recipients so the dispatch job's
 * "pending work" query actually picks them up again (dispatched_at was set
 * when the recipient was first fully handled, including reaching the
 * terminal "failed" state - leaving it set would make the dispatch job
 * finalize the batch as "sent" without ever retrying anything), and flips
 * the batch back to 'sending'.
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
          attempts: 0,
          next_attempt_at: null,
          last_error: null,
        })
      )
    )
    const failedRecipientIds = [
      ...new Set<string>(failedDeliveries.map((d: any) => d.recipient_id)),
    ]
    await Promise.all(
      failedRecipientIds.map((id: string) =>
        batchService.updateSpecialsBatchRecipients({ id, dispatched_at: null })
      )
    )
  }

  return batchService.updateSpecialsBatches({
    id: batchId,
    status: "sending",
    failed_count: 0,
  })
}
