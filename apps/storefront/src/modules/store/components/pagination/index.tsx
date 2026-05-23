"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

export function Pagination({
  page,
  totalPages,
  'data-testid': dataTestid
}: {
  page: number
  totalPages: number
  'data-testid'?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set("page", newPage.toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  const arrayRange = (start: number, stop: number) =>
    Array.from({ length: stop - start + 1 }, (_, index) => start + index)

  const renderPageButtons = () => {
    const buttons: React.ReactNode[] = []

    if (totalPages <= 7) {
      buttons.push(
        ...arrayRange(1, totalPages).map((p) => (
          <button
            key={p}
            onClick={() => handlePageChange(p)}
            disabled={p === page}
            className={`w-8 h-8 flex items-center justify-center rounded-full font-semibold text-[11px] transition-colors ${
              p === page
                ? "bg-hg-gold text-hg-on-primary"
                : "text-hg-text-secondary hover:text-hg-gold"
            }`}
          >
            {p}
          </button>
        ))
      )
    } else {
      if (page <= 4) {
        buttons.push(...arrayRange(1, 5).map((p) => (
          <button key={p} onClick={() => handlePageChange(p)} disabled={p === page} className={`w-8 h-8 flex items-center justify-center rounded-full font-semibold text-[11px] transition-colors ${p === page ? "bg-hg-gold text-hg-on-primary" : "text-hg-text-secondary hover:text-hg-gold"}`}>{p}</button>
        )))
        buttons.push(<span key="e1" className="text-hg-text-secondary">...</span>)
        buttons.push(<button key={totalPages} onClick={() => handlePageChange(totalPages)} className="w-8 h-8 flex items-center justify-center rounded-full font-semibold text-[11px] text-hg-text-secondary hover:text-hg-gold">{totalPages}</button>)
      } else if (page >= totalPages - 3) {
        buttons.push(<button key={1} onClick={() => handlePageChange(1)} className="w-8 h-8 flex items-center justify-center rounded-full font-semibold text-[11px] text-hg-text-secondary hover:text-hg-gold">1</button>)
        buttons.push(<span key="e2" className="text-hg-text-secondary">...</span>)
        buttons.push(...arrayRange(totalPages - 4, totalPages).map((p) => (
          <button key={p} onClick={() => handlePageChange(p)} disabled={p === page} className={`w-8 h-8 flex items-center justify-center rounded-full font-semibold text-[11px] transition-colors ${p === page ? "bg-hg-gold text-hg-on-primary" : "text-hg-text-secondary hover:text-hg-gold"}`}>{p}</button>
        )))
      } else {
        buttons.push(<button key={1} onClick={() => handlePageChange(1)} className="w-8 h-8 flex items-center justify-center rounded-full font-semibold text-[11px] text-hg-text-secondary hover:text-hg-gold">1</button>)
        buttons.push(<span key="e3" className="text-hg-text-secondary">...</span>)
        buttons.push(...arrayRange(page - 1, page + 1).map((p) => (
          <button key={p} onClick={() => handlePageChange(p)} disabled={p === page} className={`w-8 h-8 flex items-center justify-center rounded-full font-semibold text-[11px] transition-colors ${p === page ? "bg-hg-gold text-hg-on-primary" : "text-hg-text-secondary hover:text-hg-gold"}`}>{p}</button>
        )))
        buttons.push(<span key="e4" className="text-hg-text-secondary">...</span>)
        buttons.push(<button key={totalPages} onClick={() => handlePageChange(totalPages)} className="w-8 h-8 flex items-center justify-center rounded-full font-semibold text-[11px] text-hg-text-secondary hover:text-hg-gold">{totalPages}</button>)
      }
    }

    return buttons
  }

  return (
    <div className="mt-16 flex items-center justify-between border-t border-hg-border pt-8" data-testid={dataTestid}>
      <button
        onClick={() => page > 1 && handlePageChange(page - 1)}
        disabled={page <= 1}
        className="flex items-center gap-2 font-semibold text-[11px] text-hg-text-secondary hover:text-hg-gold transition-colors uppercase tracking-widest disabled:opacity-30"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        PREVIOUS
      </button>
      <div className="flex items-center gap-4">
        {renderPageButtons()}
      </div>
      <button
        onClick={() => page < totalPages && handlePageChange(page + 1)}
        disabled={page >= totalPages}
        className="flex items-center gap-2 font-semibold text-[11px] text-hg-text-secondary hover:text-hg-gold transition-colors uppercase tracking-widest disabled:opacity-30"
      >
        NEXT
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  )
}
