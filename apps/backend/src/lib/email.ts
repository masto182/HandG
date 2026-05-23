import { Resend } from "resend"
import { renderEmail, type EmailTemplateModule } from "./render-email"

const resend = new Resend(process.env.RESEND_API_KEY || "re_test_placeholder")

/**
 * Bootstrap defaults from env. SiteConfig can override these at runtime via
 * `refreshEmailConfig(container)` — call it from any subscriber/job before
 * generating templates so the latest admin-edited values are used.
 *
 * Resolution order (matches SiteConfigService.get):
 *   1. site_config DB override (set by admin)
 *   2. process.env.EMAIL_FROM / STORE_URL
 *   3. registry default
 */
let _fromEmail =
  process.env.EMAIL_FROM || "Example Store <noreply@example.com>"
let _storeUrl = process.env.STORE_URL || "https://example.com"

export function getEmailFrom(): string {
  return _fromEmail
}

export function getStoreUrl(): string {
  return _storeUrl
}

/**
 * Refresh module-level email config from the SiteConfig module. Call from
 * subscribers/jobs before sending. No-op if SiteConfig module isn't resolvable
 * (e.g. early bootstrap, tests) — keeps env/default fallbacks active.
 */
export async function refreshEmailConfig(container: any): Promise<void> {
  try {
    const svc = container.resolve("siteConfig") as {
      get: <T>(key: string) => Promise<T>
    }
    const [from, url] = await Promise.all([
      svc.get<string>("email_from"),
      svc.get<string>("store_url"),
    ])
    if (from) _fromEmail = from
    if (url) _storeUrl = url
  } catch {
    // SiteConfig not available; keep current values.
  }
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string
  subject: string
  html: string
  text?: string
}) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[Email] Would send to ${to}: ${subject}`)
    return
  }

  try {
    await resend.emails.send({
      from: _fromEmail,
      to,
      subject,
      html,
      text,
    } as any)
  } catch (error) {
    console.error(`[Email] Failed to send to ${to}:`, error)
  }
}

/**
 * Notification categories. First two are TRANSACTIONAL (always sent);
 * the remaining four are MARKETING (gated by NotificationPreference module
 * once Sprint 4 Block 4.2 lands).
 */
export type NotificationCategory =
  | "applications"
  | "orders"
  | "account"
  | "restock_alerts"
  | "vip_progression"
  | "referrals"
  | "wishlist_offers"

const TRANSACTIONAL_CATEGORIES: ReadonlySet<NotificationCategory> = new Set([
  "applications",
  "orders",
  "account",
])

export type SendTemplateResult = {
  sent: boolean
  reason?:
    | "opted_out"
    | "customer_missing"
    | "no_resend_key"
    | "error"
}

export type SendTemplateArgs<P> = {
  to: string
  customerId?: string
  category: NotificationCategory
  template: EmailTemplateModule<P>
  props: P
  /**
   * Optional Medusa container — used for soft customer-existence check
   * and (once Block 4.2 lands) opt-out gating. Pass `req.scope` from a
   * route handler or the container from a subscriber/job.
   */
  container?: any
}

async function customerExists(
  container: any,
  customerId: string
): Promise<boolean> {
  try {
    const customerModule = container.resolve("customer") as {
      retrieveCustomer?: (id: string) => Promise<unknown>
      listCustomers?: (filters: { id: string }) => Promise<unknown[]>
    }
    if (typeof customerModule.retrieveCustomer === "function") {
      try {
        const c = await customerModule.retrieveCustomer(customerId)
        return Boolean(c)
      } catch {
        return false
      }
    }
    if (typeof customerModule.listCustomers === "function") {
      const rows = await customerModule.listCustomers({ id: customerId })
      return Array.isArray(rows) && rows.length > 0
    }
  } catch {
    // resolve failed — treat as "we can't tell" → assume exists, don't block
  }
  return true
}

async function isOptedIn(
  container: any,
  customerId: string,
  category: NotificationCategory
): Promise<boolean> {
  try {
    const svc = container.resolve("notificationPreference") as {
      isOptedIn: (
        customerId: string,
        category: NotificationCategory
      ) => Promise<boolean>
    }
    return await svc.isOptedIn(customerId, category)
  } catch {
    // module not yet registered (Block 4.2 deliverable) — default opted-in
    return true
  }
}

/**
 * Render a template and dispatch via Resend, with category-aware gating:
 *   - Transactional categories (`applications`, `orders`) ALWAYS render+send.
 *   - Marketing categories check NotificationPreference (when available).
 *   - Soft customer-existence check skips sends to deleted customers.
 *
 * Returns `{sent, reason?}`. Never throws — caller logs the reason.
 */
export async function sendTemplate<P>({
  to,
  customerId,
  category,
  template,
  props,
  container,
}: SendTemplateArgs<P>): Promise<SendTemplateResult> {
  if (!process.env.RESEND_API_KEY) {
    const { subject } = template
    console.log(
      `[Email] Would send (no RESEND_API_KEY) to ${to}: ${subject(props)}`
    )
    return { sent: false, reason: "no_resend_key" }
  }

  if (customerId && container) {
    const exists = await customerExists(container, customerId)
    if (!exists) {
      console.log(
        `[Email] Skipped (customer ${customerId} missing): ${category} → ${to}`
      )
      return { sent: false, reason: "customer_missing" }
    }
  }

  if (!TRANSACTIONAL_CATEGORIES.has(category) && customerId && container) {
    const optedIn = await isOptedIn(container, customerId, category)
    if (!optedIn) {
      console.log(
        `[Email] Skipped (opted-out of ${category}): ${customerId} → ${to}`
      )
      return { sent: false, reason: "opted_out" }
    }
  }

  try {
    const { html, text, subject } = await renderEmail(template, props)
    await resend.emails.send({
      from: _fromEmail,
      to,
      subject,
      html,
      text,
    } as any)
    return { sent: true }
  } catch (error) {
    console.error(`[Email] sendTemplate failed (${category} → ${to}):`, error)
    return { sent: false, reason: "error" }
  }
}

export function applicationReceivedEmail(name: string) {
  return {
    subject: "We've received your application",
    html: `
      <div style="font-family: system-ui; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #D4A843; font-size: 24px;">Hops & Glory</h1>
        <p>Hi ${name},</p>
        <p>Thank you for applying to join Hops & Glory. Our team is reviewing your application and you'll hear from us soon.</p>
        <p>In the meantime, you can browse our collection to see what awaits.</p>
        <p style="margin-top: 30px;"><a href="${_storeUrl}/store" style="background: #D4A843; color: #1a1a1a; padding: 12px 24px; text-decoration: none; border-radius: 24px; font-weight: 600;">Browse Collection</a></p>
        <p style="color: #666; font-size: 12px; margin-top: 40px;">— The Hops & Glory Team</p>
      </div>
    `,
  }
}

export function applicationApprovedEmail(name: string, referralCode: string) {
  return {
    subject: "Welcome to Hops & Glory",
    html: `
      <div style="font-family: system-ui; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #D4A843; font-size: 24px;">Welcome, ${name}</h1>
        <p>Your application has been approved. You now have full access to the Hops & Glory private collection.</p>
        <p>Your personal referral code: <strong style="color: #D4A843; font-size: 18px;">${referralCode}</strong></p>
        <p>Share it with fellow collectors — every rewarded referral brings you closer to VIP status.</p>
        <p style="margin-top: 30px;"><a href="${_storeUrl}/store" style="background: #D4A843; color: #1a1a1a; padding: 12px 24px; text-decoration: none; border-radius: 24px; font-weight: 600;">Start Shopping</a></p>
        <p style="color: #666; font-size: 12px; margin-top: 40px;">— The Hops & Glory Team</p>
      </div>
    `,
  }
}

export function applicationRejectedEmail(name: string) {
  return {
    subject: "Regarding your application",
    html: `
      <div style="font-family: system-ui; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #D4A843; font-size: 24px;">Hops & Glory</h1>
        <p>Hi ${name},</p>
        <p>Unfortunately, we're unable to approve your application at this time. We maintain a very selective membership to preserve the experience for our collectors.</p>
        <p>You're welcome to reapply in the future.</p>
        <p style="color: #666; font-size: 12px; margin-top: 40px;">— The Hops & Glory Team</p>
      </div>
    `,
  }
}

export function restockAvailableEmail(name: string, beerName: string, breweryName: string, handle: string) {
  return {
    subject: `${beerName} is back in stock`,
    html: `
      <div style="font-family: system-ui; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #D4A843; font-size: 24px;">Back in Stock</h1>
        <p>Hi ${name},</p>
        <p><strong>${beerName}</strong> by ${breweryName} is available again. Act quickly — limited quantities.</p>
        <p style="margin-top: 30px;"><a href="${_storeUrl}/products/${handle}" style="background: #D4A843; color: #1a1a1a; padding: 12px 24px; text-decoration: none; border-radius: 24px; font-weight: 600;">View Product</a></p>
        <p style="color: #666; font-size: 12px; margin-top: 40px;">— The Hops & Glory Team</p>
      </div>
    `,
  }
}

export function vipTierUpEmail(name: string, newTier: string) {
  const level = newTier.replace("vip", "")
  return {
    subject: `You've reached VIP ${level}`,
    html: `
      <div style="font-family: system-ui; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #D4A843; font-size: 24px;">★ VIP ${level}</h1>
        <p>Congratulations ${name},</p>
        <p>You've been promoted to <strong>VIP ${level}</strong>. You now have access to exclusive releases and priority drops reserved for our most valued collectors.</p>
        <p style="margin-top: 30px;"><a href="${_storeUrl}/account/vip" style="background: #D4A843; color: #1a1a1a; padding: 12px 24px; text-decoration: none; border-radius: 24px; font-weight: 600;">View VIP Status</a></p>
        <p style="color: #666; font-size: 12px; margin-top: 40px;">— The Hops & Glory Team</p>
      </div>
    `,
  }
}

export function referralRewardedEmail(name: string, referralName: string) {
  return {
    subject: "Your referral placed their first order",
    html: `
      <div style="font-family: system-ui; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #D4A843; font-size: 24px;">Referral Rewarded</h1>
        <p>Hi ${name},</p>
        <p>Great news — ${referralName} just placed their first order. This counts toward your VIP progression.</p>
        <p style="margin-top: 30px;"><a href="${_storeUrl}/account/referrals" style="background: #D4A843; color: #1a1a1a; padding: 12px 24px; text-decoration: none; border-radius: 24px; font-weight: 600;">View Referrals</a></p>
        <p style="color: #666; font-size: 12px; margin-top: 40px;">— The Hops & Glory Team</p>
      </div>
    `,
  }
}
