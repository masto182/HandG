"use client"

import { useWishlist } from "@modules/wishlist/context"

type WishlistButtonProps = {
  productId: string
  variant?: "card" | "detail"
}

export default function WishlistButton({ productId, variant = "card" }: WishlistButtonProps) {
  const { isWishlisted, toggle, loading } = useWishlist()
  const wishlisted = isWishlisted(productId)
  const isLoading = loading === productId

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
          wishlisted
            ? "border-hg-gold bg-hg-gold/10 text-hg-gold"
            : "border-hg-border text-hg-text-secondary hover:border-hg-gold/50 hover:text-hg-gold"
        }`}
        aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={wishlisted ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
        {wishlisted ? "Saved" : "Save"}
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="absolute top-2 right-10 z-10 p-1.5 rounded-lg bg-hg-bg/80 hover:bg-hg-bg transition-colors"
      aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={wishlisted ? "var(--color-primary)" : "none"}
        stroke={wishlisted ? "var(--color-primary)" : "var(--color-text-muted)"}
        strokeWidth="2"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  )
}
