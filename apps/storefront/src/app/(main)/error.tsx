"use client"

import { useEffect } from "react"
import Icon from "@modules/common/components/icon"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Global error:", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="mb-10 h-20 w-20 flex items-center justify-center text-on-surface-variant">
        <Icon name="error" size={64} />
      </div>
      <h1 className="text-h1 text-on-surface mb-2">Something broke.</h1>
      <p className="text-body-lg text-on-surface-variant mb-10 max-w-[400px]">
        An unexpected error occurred. We&apos;re looking into it.
      </p>
      <div className="flex flex-col gap-2 w-full max-w-[320px]">
        <button
          onClick={reset}
          className="w-full bg-primary text-on-primary h-12 rounded-lg font-bold text-body-md hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
        <a
          href="/"
          className="w-full bg-transparent border border-outline-variant text-on-surface h-12 rounded-lg font-bold text-body-md hover:bg-surface-container-high transition-colors flex items-center justify-center"
        >
          Back to home
        </a>
      </div>
      {error.digest && (
        <div className="mt-16">
          <span className="text-label-caps text-on-surface-variant uppercase tracking-[0.2em]">{error.digest}</span>
        </div>
      )}
    </div>
  )
}
