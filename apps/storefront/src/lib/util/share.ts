/**
 * Referral share helpers.
 *
 * Provides:
 *  - `withUtm` to tag the invite link by channel
 *  - `buildIntentUrl` for per-channel desktop share intents
 *  - `shareReferral` which uses the OS native share sheet when no channel
 *    is supplied (mobile primary path) and falls back / routes to a
 *    channel-specific intent URL when one is.
 *  - `canNativeShare` platform detection (client-only, SSR-safe).
 */

export type ShareChannel = "twitter" | "email" | "facebook"

export type ShareResult = "native" | "intent" | "clipboard"

export type ShareOptions = {
  /** Omit to request the OS native share sheet. */
  channel?: ShareChannel
  link: string
  body: string
  emailSubject?: string
}

const UTM_CAMPAIGN = "member_invite"

export function canNativeShare(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false
  if (!window.isSecureContext) return false
  return typeof (navigator as Navigator & { share?: unknown }).share === "function"
}

export function withUtm(link: string, medium: string): string {
  try {
    const url = new URL(link)
    url.searchParams.set("utm_source", "referral")
    url.searchParams.set("utm_medium", medium)
    url.searchParams.set("utm_campaign", UTM_CAMPAIGN)
    return url.toString()
  } catch {
    return link
  }
}

export function buildIntentUrl(
  channel: ShareChannel,
  link: string,
  body: string,
  emailSubject?: string
): string {
  const linked = withUtm(link, channel)
  const text = body?.trim() || ""

  switch (channel) {
    case "twitter":
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(linked)}`
    case "email": {
      const subject = encodeURIComponent(emailSubject || "")
      const bodyWithLink = text ? `${text} ${linked}` : linked
      return `mailto:?subject=${subject}&body=${encodeURIComponent(bodyWithLink)}`
    }
    case "facebook":
      // Facebook's sharer ignores any text param; OG metadata at the URL drives
      // the preview. The link is all we can pass.
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(linked)}`
  }
}

async function copyFallback(text: string): Promise<boolean> {
  if (typeof navigator === "undefined") return false
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * Trigger a referral share. Pass a `channel` to use a specific desktop
 * intent URL; omit it to request the OS native share sheet (mobile).
 */
export async function shareReferral(opts: ShareOptions): Promise<ShareResult> {
  const { channel, link, body, emailSubject } = opts

  // Native share sheet path.
  if (!channel) {
    const linked = withUtm(link, "share")
    if (canNativeShare()) {
      try {
        await (navigator as Navigator & {
          share: (data: { title?: string; text?: string; url?: string }) => Promise<void>
        }).share({
          title: emailSubject,
          text: body,
          url: linked,
        })
        return "native"
      } catch (err) {
        const e = err as DOMException | Error
        if (e && (e as DOMException).name === "AbortError") return "native"
      }
    }
    const ok = await copyFallback(`${body || ""} ${linked}`.trim())
    return ok ? "clipboard" : "intent"
  }

  // Channel intent path (desktop).
  const intentUrl = buildIntentUrl(channel, link, body, emailSubject)
  const opened = typeof window !== "undefined" && window.open(intentUrl, "_blank", "noopener,noreferrer")
  if (!opened) {
    const ok = await copyFallback(`${body || ""} ${withUtm(link, channel)}`.trim())
    return ok ? "clipboard" : "intent"
  }
  return "intent"
}
