"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"

type ViewMode = "grid" | "list"

export default function ViewToggle() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const view = (searchParams.get("view") as ViewMode) || "grid"

  const setView = (mode: ViewMode) => {
    const params = new URLSearchParams(searchParams.toString())
    if (mode === "grid") {
      params.delete("view")
    } else {
      params.set("view", mode)
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex bg-hg-surface rounded-md p-1 border border-hg-border h-[42px] items-center">
      <button
        onClick={() => setView("grid")}
        className={`p-1.5 rounded h-full flex items-center px-2 transition-colors ${view === "grid" ? "bg-hl-surface2 text-hg-gold shadow-sm" : "text-hg-text-muted hover:text-hg-text"}`}
        aria-label="Grid view"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <rect x="3" y="3" width="8" height="8" rx="1" />
          <rect x="13" y="3" width="8" height="8" rx="1" />
          <rect x="3" y="13" width="8" height="8" rx="1" />
          <rect x="13" y="13" width="8" height="8" rx="1" />
        </svg>
      </button>
      <button
        onClick={() => setView("list")}
        className={`p-1.5 rounded h-full flex items-center px-2 transition-colors ${view === "list" ? "bg-hl-surface2 text-hg-gold shadow-sm" : "text-hg-text-muted hover:text-hg-text"}`}
        aria-label="List view"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <rect x="3" y="4" width="18" height="3" rx="1" />
          <rect x="3" y="10.5" width="18" height="3" rx="1" />
          <rect x="3" y="17" width="18" height="3" rx="1" />
        </svg>
      </button>
    </div>
  )
}
