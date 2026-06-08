"use client"

import { useCallback } from "react"

type CarouselNavProps = {
  containerId: string
  scrollAmount?: number
}

export default function CarouselNav({
  containerId,
  scrollAmount = 320,
}: CarouselNavProps) {
  const scroll = useCallback(
    (dir: "prev" | "next") => {
      const el = document.getElementById(containerId)
      if (!el) return
      el.scrollBy({
        left: dir === "next" ? scrollAmount : -scrollAmount,
        behavior: "smooth",
      })
    },
    [containerId, scrollAmount],
  )

  return (
    <div className="flex gap-2">
      <button
        onClick={() => scroll("prev")}
        aria-label="Scroll previous"
        className="w-10 h-10 flex items-center justify-center border border-hg-border rounded-full text-hg-text hover:bg-hg-surface transition-colors"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <button
        onClick={() => scroll("next")}
        aria-label="Scroll next"
        className="w-10 h-10 flex items-center justify-center border border-hg-border rounded-full text-hg-text hover:bg-hg-surface transition-colors"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  )
}
