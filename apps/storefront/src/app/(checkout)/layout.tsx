import { Suspense } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CheckoutHeaderNav from "@modules/checkout/components/checkout-header-nav"
import ThemeToggle from "@modules/layout/components/theme-toggle"

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="w-full bg-hg-bg relative min-h-screen">
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-6 h-16 border-b border-hg-border shadow-sm backdrop-blur-xl" style={{ backgroundColor: "color-mix(in srgb, var(--color-bg) 92%, transparent)" }}>
        <LocalizedClientLink
          href="/"
          className="text-xl font-black tracking-tighter text-hg-gold hover:text-hg-gold-hover"
          data-testid="store-link"
        >
          HOPS &amp; GLORY
        </LocalizedClientLink>
        <Suspense fallback={<div className="flex-1" />}>
          <CheckoutHeaderNav />
        </Suspense>
        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </header>
      <div className="pt-16 relative" data-testid="checkout-container">{children}</div>
    </div>
  )
}
