import { sendEmail } from "./email"

export type OwnerOrderAlert = {
  orderId: string
  orderDisplayId: string
  customerEmail: string
  customerName: string
  items: { title: string; quantity: number; unit_price: number }[]
  total: number
  subtotal?: number
  shippingTotal?: number
  discountTotal?: number
  shippingMethodName?: string
  promotionCodes?: string[]
  currencyCode: string
  isPickup: boolean
  isCash: boolean
  isPayId: boolean
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function money(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: currencyCode.toUpperCase(),
  }).format(amount)
}

export function paymentLabel(alert: Pick<OwnerOrderAlert, "isCash" | "isPayId">): string {
  if (alert.isPayId) return "PayID — awaiting transfer"
  if (alert.isCash) return "Cash on pickup"
  return "Other"
}

export function buildOwnerOrderAlert(alert: OwnerOrderAlert, adminBaseUrl: string) {
  const fulfilment = alert.isPickup ? "Pickup" : "Shipping"
  const payment = paymentLabel(alert)
  const total = money(alert.total, alert.currencyCode)
  const subject = `New order #${alert.orderDisplayId} — ${total} — ${payment}`
  const lines = alert.items.map(
    (it) => `${it.quantity} × ${it.title} (${money(it.unit_price, alert.currencyCode)})`
  )
  const link = `${adminBaseUrl.replace(/\/$/, "")}/orders/${alert.orderId}`
  const breakdown = [
    alert.subtotal !== undefined ? `Subtotal: ${money(alert.subtotal, alert.currencyCode)}` : null,
    alert.shippingTotal !== undefined
      ? `Shipping${alert.shippingMethodName ? ` (${alert.shippingMethodName})` : ""}: ${money(alert.shippingTotal, alert.currencyCode)}`
      : null,
    alert.discountTotal
      ? `Discount${alert.promotionCodes?.length ? ` (${alert.promotionCodes.join(", ")})` : ""}: -${money(alert.discountTotal, alert.currencyCode)}`
      : null,
  ].filter((l): l is string => !!l)
  const text = [
    `Order #${alert.orderDisplayId}`,
    `Customer: ${alert.customerName} <${alert.customerEmail}>`,
    `Fulfilment: ${fulfilment}`,
    `Payment: ${payment}`,
    ...breakdown,
    `Total: ${total}`,
    "",
    ...lines,
    "",
    link,
  ].join("\n")
  const html = [
    `<h2>Order #${escapeHtml(alert.orderDisplayId)}</h2>`,
    `<p>Customer: ${escapeHtml(alert.customerName)} &lt;${escapeHtml(alert.customerEmail)}&gt;<br/>`,
    `Fulfilment: ${fulfilment}<br/>Payment: <strong>${escapeHtml(payment)}</strong><br/>${breakdown.map((l) => `${escapeHtml(l)}<br/>`).join("")}Total: ${escapeHtml(total)}</p>`,
    `<ul>${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>`,
    `<p><a href="${escapeHtml(link)}">Open in admin</a></p>`,
  ].join("")
  return { subject, text, html }
}

async function resolveAlertsTo(container: any): Promise<string | undefined> {
  try {
    const svc = container.resolve("siteConfig") as {
      get: <T>(key: string) => Promise<T>
    }
    return await svc.get<string>("email_alerts_to")
  } catch {
    return undefined
  }
}

export async function notifyOwnerOfOrder(container: any, alert: OwnerOrderAlert): Promise<boolean> {
  const to = await resolveAlertsTo(container)
  if (!to || to.endsWith("@example.com")) return false
  const adminBaseUrl = `${process.env.MEDUSA_BACKEND_URL || ""}${process.env.MEDUSA_ADMIN_PATH || "/troon/admin"}`
  const { subject, text, html } = buildOwnerOrderAlert(alert, adminBaseUrl)
  await sendEmail({
    to,
    subject,
    html,
    text,
    category: "owner_alerts",
    templateName: "owner-order-alert",
    container,
  })
  return true
}
