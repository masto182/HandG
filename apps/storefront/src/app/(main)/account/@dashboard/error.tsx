"use client"

export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-[40vh] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-bold text-hg-text mb-2">Account unavailable</h2>
        <p className="text-sm text-hg-text-secondary mb-6">
          We couldn&apos;t load your account information. Please try again.
        </p>
        <button
          onClick={reset}
          className="px-6 py-2.5 border border-hg-border text-hg-text-secondary hover:text-hg-text hover:border-hg-gold/50 rounded-lg transition-colors text-sm"
        >
          Retry
        </button>
      </div>
    </div>
  )
}
