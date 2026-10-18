"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { deleteLineItem } from "@lib/data/cart"
import { productAccessForTier, type Tier } from "@lib/access/early-access"
import { formatCountdown } from "@modules/store/components/early-access-countdown"

export type GateItem = {
  lineId: string
  title: string
  metadata: Record<string, unknown> | null
}

type Props = {
  items: GateItem[]
  viewerTier: Tier | null
}

/**
 * Blocking popup shown on cart and checkout when the cart holds a product the
 * viewer's tier can't buy yet. It cannot be dismissed: the shopper waits for
 * the countdown or removes the item. The page refreshes at unlock. The server
 * rejects add, quantity changes and cart completion independently.
 */
export default function EarlyAccessCartGate({ items, viewerTier }: Props) {
  const router = useRouter()
  const [now, setNow] = useState(() => new Date())
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const locked = useMemo(
    () =>
      items
        .map((i) => ({
          ...i,
          access: productAccessForTier(i.metadata, viewerTier, now),
        }))
        .filter((i) => i.access.locked),
    [items, viewerTier, now],
  )

  const nextUnlock = locked
    .map((i) => i.access.unlockAt?.getTime())
    .filter((t): t is number => typeof t === "number")
    .sort((a, b) => a - b)[0]

  useEffect(() => {
    if (nextUnlock === undefined) return
    const wait = nextUnlock - Date.now()
    if (wait <= 0) return
    const t = setTimeout(() => router.refresh(), wait + 500)
    return () => clearTimeout(t)
  }, [nextUnlock, router])

  if (locked.length === 0) return null

  const remove = (lineId: string) =>
    startTransition(async () => {
      await deleteLineItem(lineId)
      router.refresh()
    })

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="early-access-gate-title"
      data-testid="early-access-cart-gate"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-hg-surface border border-hg-border p-6 shadow-xl">
        <h2
          id="early-access-gate-title"
          className="text-lg font-bold text-hg-text"
        >
          Not available to you yet
        </h2>
        <p className="mt-2 text-sm text-hg-text-secondary">
          Your cart has a release that hasn&apos;t unlocked for your tier. You
          can check out once it does, or remove it now.
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          {locked.map((i) => (
            <li
              key={i.lineId}
              className="flex items-center justify-between gap-3 rounded-xl border border-hg-border/50 p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-hg-text">
                  {i.title}
                </p>
                <p className="text-xs text-hg-text-secondary">
                  {i.access.unlockAt ? (
                    <>
                      Available to you in{" "}
                      <span className="font-mono font-semibold text-hg-gold">
                        {formatCountdown(
                          i.access.unlockAt.getTime() - now.getTime(),
                        )}
                      </span>
                    </>
                  ) : (
                    "Not yet available"
                  )}
                </p>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => remove(i.lineId)}
                className="shrink-0 rounded-lg border border-hg-border px-3 py-1.5 text-xs font-semibold text-hg-text hover:bg-hg-surface-dim disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <Link
          href="/store"
          className="mt-5 block text-center text-sm font-semibold text-hl-primary hover:underline"
        >
          Keep browsing
        </Link>
      </div>
    </div>
  )
}
