"use client"

import { deleteLineItem, updateLineItem } from "@lib/data/cart"
import type { LineFixAction } from "@lib/util/stock"
import { useRouter } from "next/navigation"
import { useState } from "react"

type Props = {
  actions: LineFixAction[]
}

const FixUnavailableButton = ({ actions }: Props) => {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  if (actions.length === 0) return null

  const hasReduce = actions.some((a) => a.kind === "reduce")
  const removeCount = actions.filter((a) => a.kind === "remove").length
  const label = hasReduce
    ? "Update cart and continue"
    : removeCount === 1
      ? "Remove sold-out item and continue"
      : "Remove sold-out items and continue"

  const fix = async () => {
    setBusy(true)
    setFailed(false)
    try {
      for (const action of actions) {
        if (action.kind === "remove") {
          await deleteLineItem(action.id)
        } else {
          await updateLineItem({
            lineId: action.id,
            quantity: action.quantity,
          })
        }
      }
      router.refresh()
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={fix}
        disabled={busy}
        data-testid="fix-unavailable-items"
        className="inline-flex min-h-[44px] items-center rounded-lg bg-hg-gold px-5 text-sm font-bold text-hg-bg transition-all hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hg-gold disabled:opacity-50"
      >
        {busy ? "Updating cart..." : label}
      </button>
      {failed && (
        <p role="status" className="w-full text-sm text-hl-error">
          We could not update your cart. Please go back to your cart and try
          again.
        </p>
      )}
    </>
  )
}

export default FixUnavailableButton
