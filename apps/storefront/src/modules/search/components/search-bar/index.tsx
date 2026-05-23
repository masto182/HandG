"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { sdk } from "@lib/config"
import { trackGoal } from "@lib/util/plausible"

type SearchHit = {
  id: string
  title: string
  handle: string
  brewery: string
  style: string
  thumbnail: string | null
}

export default function SearchBar() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === "Escape") {
        setOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const data = await sdk.client.fetch<{ hits: SearchHit[]; totalHits?: number }>(
        `/store/search?q=${encodeURIComponent(q)}&limit=8`,
        { method: "GET" }
      )
      setResults(data.hits || [])
      if (q.trim().length >= 2) {
        trackGoal("search", {
          q: q.trim().slice(0, 80),
          resultCount: typeof data.totalHits === "number" ? data.totalHits : (data.hits?.length ?? 0),
        })
      }
    } catch {}
    setLoading(false)
  }, [])

  const handleInput = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(value), 200)
  }

  const handleSelect = (handle: string) => {
    setOpen(false)
    setQuery("")
    setResults([])
    router.push(`/products/${handle}`)
  }

  const handleSeeAll = () => {
    setOpen(false)
    router.push(`/store?q=${encodeURIComponent(query)}`)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-high border border-outline-variant text-on-surface-variant hover:border-outline transition-all"
        aria-label="Search"
      >
        <span className="material-symbols-outlined text-[18px]">search</span>
        <span className="hidden medium:inline text-sm">Search</span>
        <kbd className="hidden medium:inline text-[10px] text-on-surface-variant/60 border border-outline-variant rounded px-1.5 py-0.5 ml-2">⌘K</kbd>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-black/60" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg mx-4 bg-surface-container-high border border-outline-variant rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant">
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant flex-shrink-0">search</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            placeholder="Search collection..."
            className="flex-1 bg-transparent text-hg-text text-sm outline-none placeholder:text-hg-text-secondary/50"
          />
          <kbd className="text-[10px] text-hg-text-secondary border border-hg-border rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        {(results.length > 0 || loading) && (
          <div className="max-h-[50vh] overflow-y-auto">
            {loading && results.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-hg-text-secondary">Searching...</div>
            )}
            {results.map((hit, i) => (
              <button
                key={hit.id}
                onClick={() => handleSelect(hit.handle)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-hg-gold/5 transition-colors text-left border-b border-hg-border/30 last:border-b-0"
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-hg-bg border border-hg-border/50 flex-shrink-0 flex items-center justify-center">
                  {hit.thumbnail ? (
                    <img src={hit.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-hg-text-secondary/30">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-hg-text truncate">{hit.title}</p>
                  <p className="text-xs text-hg-text-secondary">
                    {hit.brewery && <span>{hit.brewery}</span>}
                    {hit.brewery && hit.style && <span className="mx-1.5 opacity-40">·</span>}
                    {hit.style && <span className="text-hg-text-secondary/70">{hit.style}</span>}
                  </p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-hg-text-secondary/30 flex-shrink-0">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            ))}
            {query && results.length > 0 && (
              <div className="px-4 py-3 bg-hg-surface/50 border-t border-hg-border/50">
                <button
                  onClick={handleSeeAll}
                  className="w-full text-center text-sm text-hg-gold hover:text-hg-gold-hover transition-colors font-medium"
                >
                  See all results for &ldquo;{query}&rdquo; →
                </button>
              </div>
            )}
          </div>
        )}

        {query && !loading && results.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-hg-text-secondary">
            No results for &ldquo;{query}&rdquo;
          </div>
        )}
      </div>
    </div>
  )
}
