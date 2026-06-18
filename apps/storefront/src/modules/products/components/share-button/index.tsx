"use client"

import { useState } from "react"
import Image from "next/image"
import Modal from "@modules/common/components/modal"
import Icon from "@modules/common/components/icon"

type ShareButtonProps = {
  productTitle: string
  breweryName: string
  thumbnail?: string | null
}

function WhatsAppIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.115.549 4.099 1.508 5.826L0 24l6.335-1.481A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.898 0-3.668-.516-5.186-1.415l-.371-.22-3.762.879.916-3.658-.242-.381A9.955 9.955 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
    </svg>
  )
}

const PLATFORM_BUTTON_CLASS =
  "rounded-xl bg-hg-surface hover:bg-hg-surface-dim border border-hg-border/30 flex flex-col items-center justify-center gap-1.5 py-3 text-xs font-medium text-hg-text-secondary transition-colors"

export default function ShareButton({
  productTitle,
  breweryName,
  thumbnail,
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const getUrl = () =>
    typeof window !== "undefined" ? window.location.href : ""

  const getShareText = () =>
    breweryName
      ? `Check out ${productTitle} by ${breweryName} on Hops & Glory`
      : `Check out ${productTitle} on Hops & Glory`

  const hasNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function"

  const handleNativeShare = async () => {
    const url = getUrl()
    try {
      await navigator.share({ title: productTitle, url, text: getShareText() })
    } catch (err) {
      if ((err as DOMException)?.name !== "AbortError") {
        handleCopyLink()
      }
    }
  }

  const handleCopyLink = async () => {
    const url = getUrl()
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const input = document.createElement("input")
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand("copy")
      document.body.removeChild(input)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const openPlatform = (href: string) => {
    window.open(href, "_blank", "noopener,noreferrer")
  }

  const platformHref = {
    whatsapp: () => {
      const text = encodeURIComponent(`${getShareText()} ${getUrl()}`)
      return `https://wa.me/?text=${text}`
    },
    facebook: () =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getUrl())}`,
    email: () => {
      const subject = encodeURIComponent(`${productTitle} | Hops & Glory`)
      const body = encodeURIComponent(`${getShareText()} ${getUrl()}`)
      return `mailto:?subject=${subject}&body=${body}`
    },
    sms: () =>
      `sms:?body=${encodeURIComponent(`${getShareText()} ${getUrl()}`)}`,
  }

  const truncateUrl = (url: string) => {
    try {
      const u = new URL(url)
      const path = u.hostname + u.pathname
      return path.length > 42 ? path.slice(0, 42) + "…" : path
    } catch {
      return url
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-hg-text-secondary hover:text-hg-text border border-hg-border rounded-lg hover:bg-hg-surface transition-colors"
      >
        <Icon name="share" size={14} />
        Share
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Share"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          {/* Product preview */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-hg-surface border border-hg-border/30">
            {thumbnail ? (
              <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-hg-surface-dim">
                <Image
                  src={thumbnail}
                  alt={productTitle}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg bg-hg-surface-dim shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-hg-text truncate">
                {productTitle}
              </p>
              {breweryName && (
                <p className="text-xs text-hg-text-secondary truncate">
                  {breweryName}
                </p>
              )}
            </div>
          </div>

          {/* Native share (mobile only) */}
          {hasNativeShare && (
            <>
              <button
                onClick={handleNativeShare}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-hl-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <Icon name="ios_share" size={18} />
                Share via app
              </button>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-hg-border/30" />
                <span className="text-xs text-hg-text-muted">or share to</span>
                <div className="flex-1 h-px bg-hg-border/30" />
              </div>
            </>
          )}

          {/* Platform grid */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => openPlatform(platformHref.whatsapp())}
              className={PLATFORM_BUTTON_CLASS}
            >
              <WhatsAppIcon />
              WhatsApp
            </button>
            <button
              onClick={() => openPlatform(platformHref.facebook())}
              className={PLATFORM_BUTTON_CLASS}
            >
              <FacebookIcon />
              Facebook
            </button>
            <button
              onClick={() => {
                window.location.href = platformHref.email()
              }}
              className={PLATFORM_BUTTON_CLASS}
            >
              <Icon name="mail" size={22} />
              Email
            </button>
            <button
              onClick={() => {
                window.location.href = platformHref.sms()
              }}
              className={PLATFORM_BUTTON_CLASS}
            >
              <Icon name="sms" size={22} />
              SMS
            </button>
          </div>

          {/* Copy link bar */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-hg-surface border border-hg-border/30">
            <Icon
              name="link"
              size={16}
              className="text-hg-text-muted shrink-0"
            />
            <span className="flex-1 text-xs text-hg-text-muted truncate font-mono">
              {truncateUrl(getUrl())}
            </span>
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                copied
                  ? "bg-green-500/20 text-green-400"
                  : "bg-hg-surface-dim hover:bg-hg-border/40 text-hg-text-secondary"
              }`}
            >
              <Icon name={copied ? "check" : "content_copy"} size={13} />
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
