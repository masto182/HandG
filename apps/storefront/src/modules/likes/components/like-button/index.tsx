"use client"

import { useLikes } from "@modules/likes/context"

type LikeButtonProps = {
  productId: string
  initialCount?: number
  variant?: "card" | "detail"
}

export default function LikeButton({ productId, initialCount = 0, variant = "card" }: LikeButtonProps) {
  const { isLiked, getCount, setCount, toggle, loading } = useLikes()
  const liked = isLiked(productId)
  const count = getCount(productId) || initialCount
  const isLoading = loading === productId

  if (count === 0 && initialCount > 0) {
    setCount(productId, initialCount)
  }

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    await toggle(productId)
  }

  if (variant === "detail") {
    return (
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`flex items-center gap-2 px-4 py-2 rounded border transition-colors text-sm ${
          liked
            ? "border-red-400/50 bg-red-400/10 text-red-400"
            : "border-hg-border text-hg-text-secondary hover:border-red-400/50 hover:text-red-400"
        }`}
        aria-label={liked ? "Unlike" : "Like"}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={liked ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        {count > 0 && <span className="text-xs tabular-nums">{count}</span>}
      </button>
    )
  }

  return (
    <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="p-1.5 rounded-lg bg-hg-bg/80 hover:bg-hg-bg transition-colors"
        aria-label={liked ? "Unlike" : "Like"}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={liked ? "#f87171" : "none"}
          stroke={liked ? "#f87171" : "var(--color-text-muted)"}
          strokeWidth="2"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>
      {count > 0 && (
        <span className="text-[10px] text-hg-text-muted tabular-nums bg-hg-bg/80 rounded px-1 py-0.5">
          {count}
        </span>
      )}
    </div>
  )
}
