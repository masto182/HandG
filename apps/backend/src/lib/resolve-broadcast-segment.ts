import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { VIP_TIERS_ORDERED, getTierIndex } from "../workflows/constants/vip-tiers"
import { VIP_SCORE_MODULE } from "../modules/vip-score"
import { BREWERY_FOLLOW_MODULE } from "../modules/brewery-follow"
import { HOP_ALERT_MODULE } from "../modules/hop-alert"
import {
  NOTIFICATION_CATEGORIES,
  isKnownCategory,
} from "../modules/notification-preference/categories"
import type { NotificationCategory } from "./email"

export type BroadcastSegmentFilter = {
  vip_tier_min?: string
  category_optin?: NotificationCategory
  brewery_id?: string
  hop_id?: string
  has_ordered?: boolean
  account_status?: string
}

const PAGE_SIZE = 1000

/** Paginate over customerModule.listCustomers, collecting a projected field. */
async function collectAllCustomerIds(
  container: any,
  filters: Record<string, unknown> = {}
): Promise<Set<string>> {
  const customerModule = container.resolve(Modules.CUSTOMER) as any
  const ids = new Set<string>()
  let skip = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const page = await customerModule.listCustomers(filters, {
      select: ["id"],
      skip,
      take: PAGE_SIZE,
    })
    for (const c of page) ids.add(c.id)
    if (page.length < PAGE_SIZE) break
    skip += PAGE_SIZE
  }
  return ids
}

async function resolveVipTierMin(container: any, tierMin: string): Promise<Set<string>> {
  const vipScoreService = container.resolve(VIP_SCORE_MODULE) as any
  const minIndex = getTierIndex(tierMin)
  const eligibleTiers = VIP_TIERS_ORDERED.filter((t) => getTierIndex(t) >= minIndex)
  const rows = await vipScoreService.listVipScores({ current_tier: eligibleTiers })
  return new Set(rows.map((r: any) => r.customer_id))
}

async function resolveCategoryOptin(
  container: any,
  category: NotificationCategory
): Promise<Set<string>> {
  const prefService = container.resolve("notificationPreference") as any

  // default_enabled categories: opted-in = all customers minus explicit disables.
  const def = NOTIFICATION_CATEGORIES.find((c) => c.category === category)
  const defaultEnabled = isKnownCategory(category) ? (def?.default_enabled ?? true) : true

  if (defaultEnabled) {
    const disabledRows = await prefService.listNotificationPreferences({
      category,
      enabled: false,
    })
    const disabledIds = new Set<string>(disabledRows.map((r: any) => r.customer_id))
    const allIds = await collectAllCustomerIds(container)
    return new Set([...allIds].filter((id) => !disabledIds.has(id)))
  }

  const enabledRows = await prefService.listNotificationPreferences({
    category,
    enabled: true,
  })
  return new Set(enabledRows.map((r: any) => r.customer_id))
}

async function resolveBreweryFollowed(container: any, breweryId: string): Promise<Set<string>> {
  const breweryFollowService = container.resolve(BREWERY_FOLLOW_MODULE) as any
  const rows = await breweryFollowService.listBreweryFollows({ brewery_id: breweryId })
  return new Set(rows.map((r: any) => r.customer_id))
}

async function resolveHopFollowed(container: any, hopId: string): Promise<Set<string>> {
  const hopAlertService = container.resolve(HOP_ALERT_MODULE) as any
  const rows = await hopAlertService.listHopAlerts({ hop_id: hopId })
  return new Set(rows.map((r: any) => r.customer_id))
}

async function resolveHasOrdered(container: any): Promise<Set<string>> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as any
  const ids = new Set<string>()
  let skip = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await query.graph({
      entity: "order",
      fields: ["customer_id"],
      pagination: { skip, take: PAGE_SIZE },
    })
    for (const o of data) {
      if (o.customer_id) ids.add(o.customer_id)
    }
    if (data.length < PAGE_SIZE) break
    skip += PAGE_SIZE
  }
  return ids
}

async function resolveAccountStatus(container: any, status: string): Promise<Set<string>> {
  return collectAllCustomerIds(container, { metadata: { status } })
}

/**
 * Resolves the AND-intersection of every filter present in `filter`. Narrowest
 * dimensions run first so we avoid materialising the full customer table when
 * a narrower filter is already present. Returns the full customer universe
 * (paginated) when no filter is set.
 */
export async function resolveSegment(
  container: any,
  filter: BroadcastSegmentFilter
): Promise<string[]> {
  const resolvers: Array<() => Promise<Set<string>>> = []

  if (filter.brewery_id) resolvers.push(() => resolveBreweryFollowed(container, filter.brewery_id!))
  if (filter.hop_id) resolvers.push(() => resolveHopFollowed(container, filter.hop_id!))
  if (filter.vip_tier_min) resolvers.push(() => resolveVipTierMin(container, filter.vip_tier_min!))
  if (filter.category_optin)
    resolvers.push(() => resolveCategoryOptin(container, filter.category_optin!))
  if (filter.account_status)
    resolvers.push(() => resolveAccountStatus(container, filter.account_status!))
  if (filter.has_ordered) resolvers.push(() => resolveHasOrdered(container))

  if (resolvers.length === 0) {
    return [...(await collectAllCustomerIds(container))]
  }

  let result: Set<string> | null = null
  for (const resolve of resolvers) {
    const set: Set<string> = await resolve()
    if (result === null) {
      result = set
    } else {
      const prev: Set<string> = result
      result = new Set([...prev].filter((id) => set.has(id)))
    }
    if (result.size === 0) break
  }

  return [...(result ?? new Set<string>())]
}

/** Same resolution, returned as a count only — used for the admin preview endpoint. */
export async function countSegment(
  container: any,
  filter: BroadcastSegmentFilter
): Promise<number> {
  const ids = await resolveSegment(container, filter)
  return ids.length
}
