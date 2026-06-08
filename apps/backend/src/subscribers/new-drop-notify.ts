import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { sendTemplate, refreshEmailConfig, getStoreUrl } from "../lib/email"
import { isQuietHours, exceedsThrottle } from "../lib/alert-throttle"
import { ALERT_DISPATCH_MODULE } from "../modules/alert-dispatch"
import { BREWERY_FOLLOW_MODULE } from "../modules/brewery-follow"
import { HOP_ALERT_MODULE } from "../modules/hop-alert"
import { INBOX_MODULE } from "../modules/notification"
import * as NewDropTpl from "../emails/new-drop"

export type AlertKind = "all_new" | "brewery" | "hop"

export type Recipient = {
  customer_id: string
  want_email: boolean
  want_inapp: boolean
  kind: AlertKind
}

type ChannelRow = {
  customer_id: string
  channel_email: boolean
  channel_inapp: boolean
}

const KIND_RANK: Record<AlertKind, number> = { hop: 3, brewery: 2, all_new: 1 }
const CATEGORY_BY_KIND: Record<AlertKind, "hop_alerts" | "brewery_releases" | "new_drops"> = {
  hop: "hop_alerts",
  brewery: "brewery_releases",
  all_new: "new_drops",
}

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
    want_inapp: boolean
  ) => {
    if (args.alreadyDispatched.has(customer_id)) return
    const existing = byCustomer.get(customer_id)
    if (!existing) {
      byCustomer.set(customer_id, { customer_id, kind, want_email, want_inapp })
      return
    }
    existing.want_email = existing.want_email || want_email
    existing.want_inapp = existing.want_inapp || want_inapp
    if (KIND_RANK[kind] > KIND_RANK[existing.kind]) existing.kind = kind
  }

  for (const r of args.hopAlerts) apply(r.customer_id, "hop", r.channel_email, r.channel_inapp)
  for (const r of args.breweryFollows)
    apply(r.customer_id, "brewery", r.channel_email, r.channel_inapp)
  for (const r of args.allNew) apply(r.customer_id, "all_new", true, true)

  return [...byCustomer.values()]
}

export default async function newDropNotify({ event, container }: SubscriberArgs<{ id: string }>) {
  const productId = event.data.id
  const logger = container.resolve("logger") as any
  const productModule = container.resolve(Modules.PRODUCT)
  const customerModule = container.resolve(Modules.CUSTOMER)
  const siteConfig = container.resolve("siteConfig") as any
  const dispatchService = container.resolve(ALERT_DISPATCH_MODULE) as any
  const breweryFollowService = container.resolve(BREWERY_FOLLOW_MODULE) as any
  const hopAlertService = container.resolve(HOP_ALERT_MODULE) as any
  const notificationService = container.resolve(INBOX_MODULE) as any
  const prefService = container.resolve("notificationPreference") as any

  const [product] = await productModule.listProducts(
    { id: productId },
    { select: ["id", "title", "handle", "status", "metadata"] }
  )
  if (!product || product.status !== "published") return

  const settings = await siteConfig.getMany([
    "alerts_new_drops_enabled",
    "alerts_max_per_day",
    "alerts_quiet_enabled",
    "alerts_quiet_from",
    "alerts_quiet_to",
    "alerts_quiet_tz",
  ])
  if (settings.alerts_new_drops_enabled === false) return

  let hopIds: string[] = []
  let breweries: Array<{ id: string; name: string }> = []
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "product",
      fields: ["hops.id", "breweries.id", "breweries.name"],
      filters: { id: productId },
    })
    hopIds = ((data?.[0] as any)?.hops || []).map((h: any) => h.id).filter(Boolean)
    breweries = ((data?.[0] as any)?.breweries || []).filter((b: any) => b?.id)
  } catch (err) {
    logger.warn(`[NewDrop] linked lookup failed for ${productId}: ${err}`)
  }

  const breweryIds = breweries.map((b) => b.id)

  const breweryFollows: ChannelRow[] = breweryIds.length
    ? await breweryFollowService.listBreweryFollows({ brewery_id: breweryIds })
    : []
  const hopAlerts: ChannelRow[] = hopIds.length
    ? await hopAlertService.listHopAlerts({ hop_id: hopIds })
    : []
  const allNew = await prefService.listNotificationPreferences({
    category: "new_drops",
    enabled: true,
  })

  const existingDispatches = await dispatchService.listAlertDispatches({ product_id: productId })
  const alreadyDispatched = new Set<string>(existingDispatches.map((d: any) => d.customer_id))

  const recipients = mergeRecipients({ breweryFollows, hopAlerts, allNew, alreadyDispatched })
  if (recipients.length === 0) return

  await refreshEmailConfig(container)
  const storeUrl = getStoreUrl()
  const now = new Date()
  const quiet = isQuietHours(now, {
    enabled: settings.alerts_quiet_enabled !== false,
    fromHour: Number(settings.alerts_quiet_from ?? 22),
    toHour: Number(settings.alerts_quiet_to ?? 8),
    tz: String(settings.alerts_quiet_tz ?? "Australia/Sydney"),
  })
  const maxPerDay = Number(settings.alerts_max_per_day ?? 3)
  const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const beerName = product.title || "New release"
  const breweryName = breweries[0]?.name || (product as any).metadata?.brewery || ""
  const handle = product.handle || ""

  for (const r of recipients) {
    try {
      const [customer] = await customerModule.listCustomers({ id: r.customer_id })
      if (!customer) continue

      if (r.want_inapp) {
        await notificationService.createNotifications({
          customer_id: r.customer_id,
          type: "new_drop",
          title: `New drop: ${beerName}`,
          body: breweryName
            ? `${beerName} by ${breweryName} just dropped.`
            : `${beerName} just dropped.`,
          metadata: { product_id: productId, handle, kind: r.kind },
        })
      }

      let sendEmail = r.want_email && !quiet && !!customer.email
      if (sendEmail) {
        const recent = await dispatchService.listAlertDispatches({ customer_id: r.customer_id })
        const sentInWindow = recent.filter(
          (d: any) => d.email_sent && d.dispatched_at && new Date(d.dispatched_at) >= windowStart
        ).length
        if (exceedsThrottle(sentInWindow, maxPerDay)) sendEmail = false
      }

      const created = await dispatchService.createAlertDispatches({
        customer_id: r.customer_id,
        product_id: productId,
        kind: r.kind,
        channel_email: r.want_email,
        channel_inapp: r.want_inapp,
        email_sent: sendEmail,
        dispatched_at: now,
      })
      const dispatch = Array.isArray(created) ? created[0] : created

      if (sendEmail) {
        const reason =
          r.kind === "hop"
            ? "a hop you follow"
            : r.kind === "brewery"
              ? "a brewery you follow"
              : "all new releases"
        await sendTemplate({
          to: customer.email,
          customerId: customer.id,
          category: CATEGORY_BY_KIND[r.kind],
          template: NewDropTpl,
          props: {
            name: customer.first_name || "Collector",
            beerName,
            breweryName,
            reason,
            handle: handle ? `${handle}?alert=${dispatch.id}` : handle,
            storeUrl,
          },
          container,
        })
      }
    } catch (err) {
      logger.error(`[NewDrop] Failed for ${r.customer_id} on ${productId}: ${err}`)
    }
  }
}

export const config: SubscriberConfig = {
  event: ["product.created", "product.updated"],
}
