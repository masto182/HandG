import { Suspense } from "react"

import { listLocales } from "@lib/data/locales"
import { getLocale } from "@lib/data/locale-actions"
import { listRegions } from "@lib/data/regions"
import { HttpTypes, StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import SideMenu from "@modules/layout/components/side-menu"
import ThemeToggle from "@modules/layout/components/theme-toggle"
import AnnouncementStrip from "@modules/layout/components/announcement-strip"
import Icon from "@modules/common/components/icon"
import SearchBar from "@modules/search/components/search-bar"
import VipBadge from "@modules/layout/components/vip-badge"
import { MembershipStatus, isApprovedMember } from "@lib/data/membership"
import { breweryLabel } from "@lib/util/brewery-label"

type NavProps = {
  membershipStatus?: MembershipStatus
  customer?: HttpTypes.StoreCustomer | null
}

export default async function Nav({ membershipStatus = "public", customer }: NavProps) {
  const [regions, locales, currentLocale] = await Promise.all([
    listRegions().then((regions: StoreRegion[]) => regions),
    listLocales(),
    getLocale(),
  ])

  const isApproved = isApprovedMember(membershipStatus)
  const isLoggedIn = membershipStatus !== "public"

  const avatarUrl = (customer?.metadata as Record<string, string> | null)?.avatar_url
  const initial = customer?.first_name?.charAt(0)?.toUpperCase() || "?"

  return (
    <div className="sticky top-0 inset-x-0 z-50 group">
      <AnnouncementStrip />
      <header className="relative h-20 w-full border-b border-hg-border backdrop-blur-lg" style={{ backgroundColor: "color-mix(in srgb, var(--color-bg) 90%, transparent)" }}>
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-6 lg:px-10">
          <div className="flex items-center gap-12">
            <div className="small:hidden">
              <SideMenu regions={regions} locales={locales} currentLocale={currentLocale} isApproved={isApproved} isLoggedIn={isLoggedIn} />
            </div>
            <LocalizedClientLink
              href="/"
              className="flex items-center"
              data-testid="nav-store-link"
            >
              <span className="text-xl font-bold uppercase tracking-[0.15em] text-hg-text">
                Hops <span className="text-hg-gold">&amp;</span> Glory
              </span>
            </LocalizedClientLink>
            <nav className="hidden items-center gap-8 lg:flex">
              <LocalizedClientLink href="/store" className="text-sm font-medium text-hg-text-secondary tracking-tight transition-colors hover:text-hg-text">
                Collection
              </LocalizedClientLink>
              <LocalizedClientLink href="/breweries" className="text-sm font-medium text-hg-text-secondary tracking-tight transition-colors hover:text-hg-text">
                {breweryLabel(isApproved)}
              </LocalizedClientLink>
              {isApproved && (
                <LocalizedClientLink href="/account/wishlist" className="text-sm font-medium text-hg-text-secondary tracking-tight transition-colors hover:text-hg-text">
                  Wishlist
                </LocalizedClientLink>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-6">
            <SearchBar />

            <ThemeToggle />

            <div className="flex items-center gap-4 border-l border-hg-border pl-6">
              {isApproved && (
                <>
                  <LocalizedClientLink
                    href="/account/referrals"
                    className="flex items-center gap-1.5 text-sm font-semibold text-hg-gold tracking-tight transition-opacity hover:opacity-80 mr-2"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="hidden sm:inline">Referrals</span>
                  </LocalizedClientLink>
                  <VipBadge tier={membershipStatus} />
                </>
              )}

              {isApproved ? (
                <LocalizedClientLink href="/account" className="h-8 w-8 rounded-full overflow-hidden border border-hg-border hover:border-hg-gold transition-colors">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-hg-surface flex items-center justify-center">
                      <span className="text-xs font-bold text-hg-text-secondary">{initial}</span>
                    </div>
                  )}
                </LocalizedClientLink>
              ) : (
                <>
                  {!isLoggedIn && (
                    <LocalizedClientLink
                      href="/account"
                      className="text-[11px] font-bold uppercase tracking-widest text-hg-text-secondary hover:text-hg-text transition-colors"
                    >
                      Sign In
                    </LocalizedClientLink>
                  )}
                  <LocalizedClientLink
                    href="/apply"
                    className="text-[11px] font-bold uppercase tracking-widest px-4 py-2 border border-hg-gold text-hg-gold rounded-sm hover:bg-hg-gold hover:text-hg-on-primary transition-colors"
                  >
                    Apply
                  </LocalizedClientLink>
                </>
              )}

              {isApproved && (
                <Suspense
                  fallback={
                    <LocalizedClientLink
                      className="relative flex items-center gap-2 text-hg-text-secondary transition-colors hover:text-hg-text"
                      href="/cart"
                      data-testid="nav-cart-link"
                    >
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                      </svg>
                      <span className="hidden text-sm font-medium sm:inline">Cart</span>
                    </LocalizedClientLink>
                  }
                >
                  <CartButton />
                </Suspense>
              )}
            </div>
          </div>
        </div>
      </header>
    </div>
  )
}
