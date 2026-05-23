"use client"

export default function StoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-[40vh] flex items-center justify-center px-6 content-container">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-bold text-hg-text mb-2">Unable to load collection</h2>
        <p className="text-sm text-hg-text-secondary mb-6">
          We couldn&apos;t load the collection right now. Please try again.
        </p>
        <button
          onClick={reset}
          className="px-6 py-2.5 bg-hg-gold hover:bg-hg-gold-hover text-hg-bg font-semibold rounded-lg transition-colors text-sm"
        >
          Retry
        </button>
      </div>
    </div>
  )
}
