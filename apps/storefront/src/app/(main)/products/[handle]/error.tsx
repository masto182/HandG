"use client"

export default function ProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-[40vh] flex items-center justify-center px-6 content-container">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-bold text-hg-text mb-2">Product unavailable</h2>
        <p className="text-sm text-hg-text-secondary mb-6">
          This product couldn&apos;t be loaded right now.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-2.5 border border-hg-border text-hg-text-secondary hover:text-hg-text rounded-lg transition-colors text-sm"
          >
            Retry
          </button>
          <a
            href="/store"
            className="px-6 py-2.5 bg-hg-gold hover:bg-hg-gold-hover text-hg-bg font-semibold rounded-lg transition-colors text-sm"
          >
            Browse collection
          </a>
        </div>
      </div>
    </div>
  )
}
