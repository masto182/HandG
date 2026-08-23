import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ALERT_DISPATCH_MODULE } from "../modules/alert-dispatch"
import { BREWERY_FOLLOW_MODULE } from "../modules/brewery-follow"
import { HOP_ALERT_MODULE } from "../modules/hop-alert"

export type AlertKind = "all_new" | "brewery" | "hop"
export type AlertCategory = "hop_alerts" | "brewery_releases" | "new_drops"

export type Recipient = {
  customer_id: string
  want_email: boolean
  want_inapp: boolean
  /** Winning kind for SECTION PLACEMENT only (brewery > hop > all_new). */
  kind: AlertKind
  /** Names of followed breweries matched on this product - independent of `kind`. */
  breweryNames: string[]
  /** Names of followed hops matched on this product - independent of `kind`. */
  hopNames: string[]
}

export type RecipientMatch = Recipient & { category: AlertCategory }

type ChannelRow = {
  customer_id: string
  channel_email: boolean
  channel_inapp: boolean
  /** Brewery or hop name for this specific follow row (for narrative naming). */
  name?: string
}

/**
 * Placement priority: brewery leads, hop is secondary, all_new is the
 * generic fallback. NOTE: this is the OPPOSITE order from the original
 * WI-70 build (which ranked hop above brewery) - the personalized-narrative
 * follow-up flipped it so a brewery follower always sees their brewery lead
 * the email, with any hop match preserved as a tag rather than winning
 * placement outright.
 */
export const KIND_RANK: Record<AlertKind, number> = {
  brewery: 3,
  hop: 2,
  all_new: 1,
}

export const CATEGORY_BY_KIND: Record<AlertKind, AlertCategory> = {
  brewery: "brewery_releases",
  hop: "hop_alerts",
  all_new: "new_drops",
}

/**
 * Pure merge/dedup: one Recipient per customer_id, taking the highest-ranked
 * kind (brewery > hop > all_new) for SECTION PLACEMENT, unioning channel
 * preferences across every reason that matched, and - unlike the original
 * build - preserving the matched brewery/hop NAMES independently of which
 * kind won. This lets a brewery-led item still be tagged with a matched hop
 * name instead of that match being discarded.
 */
export function mergeRecipients(args: {
  breweryFollows: ChannelRow[]
  hopAlerts: ChannelRow[]
  allNew: Array<{ customer_id: string }>
  alreadyDispatched: Set<string>
}): Recipient[] {
  const byCustomer = new Map<string, Recipient>()

  const apply = (
    customer_id: string,
    kind: AlertKind,
    want_email: boolean,
    want_inapp: boolean,
    name?: string
  ) => {
    if (args.alreadyDispatched.has(customer_id)) return
    let existing = byCustomer.get(customer_id)
    if (!existing) {
      existing = { customer_id, kind, want_email, want_inapp, breweryNames: [], hopNames: [] }
      byCustomer.set(customer_id, existing)
    }
    existing.want_email = existing.want_email || want_email
    existing.want_inapp = existing.want_inapp || want_inapp
    if (KIND_RANK[kind] > KIND_RANK[existing.kind]) existing.kind = kind
    if (kind === "brewery" && name && !existing.breweryNames.includes(name)) {
      existing.breweryNames.push(name)
    }
    if (kind === "hop" && name && !existing.hopNames.includes(name)) {
      existing.hopNames.push(name)
    }
  }

  for (const r of args.hopAlerts)
    apply(r.customer_id, "hop", r.channel_email, r.channel_inapp, r.name)
  for (const r of args.breweryFollows)
    apply(r.customer_id, "brewery", r.channel_email, r.channel_inapp, r.name)
  for (const r of args.allNew) apply(r.customer_id, "all_new", true, true)

  return [...byCustomer.values()]
}

/**
 * Resolves the deduped recipient list for ONE product: brewery followers +
 * hop-alert followers + all-new opt-ins, minus customers who already have
 * an alert_dispatch row for this product (so a product can never be
 * re-sent to the same customer, even across separate batches). Each
 * recipient carries a `category` for section placement (highest-ranked
 * match: brewery > hop > all_new) plus the full `breweryNames`/`hopNames`
 * it actually matched on, so the narrative builder can tag a brewery-led
 * beer with a matched hop name instead of losing that information.
 */
export async function resolveRecipientsForProduct(
  container: any,
  productId: string
): Promise<{
  recipients: RecipientMatch[]
  breweryIds: string[]
  breweryNames: string[]
}> {
  const dispatchService = container.resolve(ALERT_DISPATCH_MODULE) as any
  const breweryFollowService = container.resolve(BREWERY_FOLLOW_MODULE) as any
  const hopAlertService = container.resolve(HOP_ALERT_MODULE) as any
  const prefService = container.resolve("notificationPreference") as any
  const logger = container.resolve("logger") as any

  let hops: Array<{ id: string; name: string }> = []
  let breweries: Array<{ id: string; name: string }> = []
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "product",
      fields: ["hops.id", "hops.name", "breweries.id", "breweries.name"],
      filters: { id: productId },
    })
    hops = ((data?.[0] as any)?.hops || []).filter((h: any) => h?.id)
    breweries = ((data?.[0] as any)?.breweries || []).filter((b: any) => b?.id)
  } catch (err) {
    logger?.warn?.(`[NewDropBatch] linked lookup failed for ${productId}: ${err}`)
  }

  const breweryIds = breweries.map((b) => b.id)
  const breweryNames = breweries.map((b) => b.name).filter(Boolean)
  const breweryNameById = new Map(breweries.map((b) => [b.id, b.name]))
  const hopIds = hops.map((h) => h.id)
  const hopNameById = new Map(hops.map((h) => [h.id, h.name]))

  const breweryFollowRows: Array<{
    customer_id: string
    brewery_id: string
    channel_email: boolean
    channel_inapp: boolean
  }> = breweryIds.length
    ? await breweryFollowService.listBreweryFollows({ brewery_id: breweryIds })
    : []
  const hopAlertRows: Array<{
    customer_id: string
    hop_id: string
    channel_email: boolean
    channel_inapp: boolean
  }> = hopIds.length ? await hopAlertService.listHopAlerts({ hop_id: hopIds }) : []
  const allNew = await prefService.listNotificationPreferences({
    category: "new_drops",
    enabled: true,
  })

  const breweryFollows: ChannelRow[] = breweryFollowRows.map((r) => ({
    customer_id: r.customer_id,
    channel_email: r.channel_email,
    channel_inapp: r.channel_inapp,
    name: breweryNameById.get(r.brewery_id),
  }))
  const hopAlerts: ChannelRow[] = hopAlertRows.map((r) => ({
    customer_id: r.customer_id,
    channel_email: r.channel_email,
    channel_inapp: r.channel_inapp,
    name: hopNameById.get(r.hop_id),
  }))

  const existingDispatches = await dispatchService.listAlertDispatches({
    product_id: productId,
  })
  // Only treat a customer as "already notified" for this product if a
  // dispatch actually resulted in a sent email - the old (pre-batch)
  // subscriber created dispatch rows optimistically, before confirming
  // send success, so a customer can have a dispatch row here despite never
  // actually receiving anything. Excluding on row-existence alone would
  // permanently block real customers from ever being notified about a
  // product whose original send silently failed.
  const alreadyDispatched = new Set<string>(
    existingDispatches.filter((d: any) => d.email_sent).map((d: any) => d.customer_id)
  )

  const merged = mergeRecipients({ breweryFollows, hopAlerts, allNew, alreadyDispatched })
  const recipients: RecipientMatch[] = merged.map((r) => ({
    ...r,
    category: CATEGORY_BY_KIND[r.kind],
  }))

  return { recipients, breweryIds, breweryNames }
}
