import { Metadata } from "next"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export const metadata: Metadata = {
  title: "404",
  description: "Page not found",
}

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="relative mb-10 h-20 w-20 flex items-center justify-center text-on-surface-variant">
        <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 5V19C7 20.1046 7.89543 21 9 21H15C16.1046 21 17 20.1046 17 19V5C17 3.89543 16.1046 3 15 3H9C7.89543 3 7 3.89543 7 5Z" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
          <path d="M7 6H17M9 3.5V4.5M15 3.5V4.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
          <line stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" x1="3" x2="21" y1="21" y2="3" />
        </svg>
      </div>
      <h1 className="text-h1 text-on-surface mb-2">Nothing here.</h1>
      <p className="text-body-lg text-on-surface-variant mb-10 max-w-[400px]">
        The page you&apos;re looking for isn&apos;t part of the cellar.
      </p>
      <div className="flex flex-col gap-2 w-full max-w-[320px]">
        <LocalizedClientLink
          href="/"
          className="w-full bg-primary text-on-primary h-12 rounded-lg font-bold text-body-md hover:opacity-90 transition-opacity flex items-center justify-center"
        >
          Back to home
        </LocalizedClientLink>
        <LocalizedClientLink
          href="/store"
          className="w-full bg-transparent border border-outline-variant text-on-surface h-12 rounded-lg font-bold text-body-md hover:bg-surface-container-high transition-colors flex items-center justify-center"
        >
          Browse the Collection
        </LocalizedClientLink>
      </div>
      <div className="mt-16">
        <span className="text-label-caps text-on-surface-variant uppercase tracking-[0.2em]">404</span>
      </div>
    </div>
  )
}
