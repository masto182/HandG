"use client"

import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react"
import { XMark } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Locale } from "@lib/data/locales"
import { signout } from "@lib/data/customer"
import { useParams } from "next/navigation"
import { createPortal } from "react-dom"
import { breweryLabel } from "@lib/util/brewery-label"
import { useEffect, useState } from "react"

type SideMenuProps = {
  regions: HttpTypes.StoreRegion[] | null
  locales: Locale[] | null
  currentLocale: string | null
  isApproved?: boolean
  isLoggedIn?: boolean
}

const SideMenu = ({ regions, locales, currentLocale, isApproved = false, isLoggedIn = false }: SideMenuProps) => {
  const { countryCode } = useParams() as { countryCode: string }
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const handleLogout = async () => {
    await signout(countryCode)
  }

  return (
    <div className="h-full">
      <div className="flex items-center h-full">
        <Popover className="h-full flex">
          {({ open, close }: { open: boolean; close: () => void }) => (
            <>
              <div className="relative flex h-full">
                <PopoverButton
                  data-testid="nav-menu-button"
                  className="relative h-full flex items-center transition-all ease-out duration-200 focus:outline-none hover:text-hg-gold text-hg-text-secondary"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </PopoverButton>
              </div>

              {mounted && createPortal(
                <>
                  {open && (
                    <div
                      className="fixed inset-0 z-[9998] bg-black/60"
                      onClick={close}
                      data-testid="side-menu-backdrop"
                    />
                  )}
                  <div
                    className={`fixed inset-y-0 left-0 z-[9999] w-[280px] bg-hg-bg border-r border-hg-border flex flex-col transform transition-transform duration-200 ease-out ${
                      open ? "translate-x-0" : "-translate-x-full pointer-events-none"
                    }`}
                    data-testid="nav-menu-popup"
                  >
                    <div className="flex items-center justify-between px-6 h-16 border-b border-hg-border">
                      <span className="text-hg-gold font-bold text-lg">Hops & Glory</span>
                      <button data-testid="close-menu-button" onClick={close} className="text-hg-text-secondary hover:text-hg-text p-1">
                        <XMark />
                      </button>
                    </div>

                    <nav className="flex-1 px-6 py-8 overflow-y-auto">
                      <ul className="flex flex-col gap-1">
                        <li>
                          <LocalizedClientLink
                            href="/store"
                            className="flex items-center gap-3 px-3 py-3 rounded-lg text-hg-text hover:bg-hg-surface transition-colors"
                            onClick={close}
                            data-testid="store-link"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-hg-text-secondary">
                              <rect x="3" y="3" width="7" height="7" />
                              <rect x="14" y="3" width="7" height="7" />
                              <rect x="3" y="14" width="7" height="7" />
                              <rect x="14" y="14" width="7" height="7" />
                            </svg>
                            <span className="font-medium">Collection</span>
                          </LocalizedClientLink>
                        </li>
                        <li>
                          <LocalizedClientLink
                            href="/breweries"
                            className="flex items-center gap-3 px-3 py-3 rounded-lg text-hg-text hover:bg-hg-surface transition-colors"
                            onClick={close}
                            data-testid="breweries-link"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-hg-text-secondary">
                              <path d="M17 8h1a4 4 0 110 8h-1" />
                              <path d="M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8z" />
                              <line x1="6" y1="2" x2="6" y2="4" />
                              <line x1="10" y1="2" x2="10" y2="4" />
                              <line x1="14" y1="2" x2="14" y2="4" />
                            </svg>
                            <span className="font-medium">{breweryLabel(isApproved)}</span>
                          </LocalizedClientLink>
                        </li>
                        {isApproved && (
                          <li>
                            <LocalizedClientLink
                              href="/account"
                              className="flex items-center gap-3 px-3 py-3 rounded-lg text-hg-text hover:bg-hg-surface transition-colors"
                              onClick={close}
                              data-testid="account-link"
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-hg-text-secondary">
                                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                              </svg>
                              <span className="font-medium">Account</span>
                            </LocalizedClientLink>
                          </li>
                        )}
                        {isApproved && (
                          <li>
                            <LocalizedClientLink
                              href="/cart"
                              className="flex items-center gap-3 px-3 py-3 rounded-lg text-hg-text hover:bg-hg-surface transition-colors"
                              onClick={close}
                              data-testid="cart-link"
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-hg-text-secondary">
                                <circle cx="9" cy="21" r="1" />
                                <circle cx="20" cy="21" r="1" />
                                <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
                              </svg>
                              <span className="font-medium">Cart</span>
                            </LocalizedClientLink>
                          </li>
                        )}
                        {isApproved && (
                          <li>
                            <button
                              onClick={() => { handleLogout() }}
                              className="flex items-center gap-3 px-3 py-3 rounded-lg text-hg-text-secondary hover:bg-hg-surface transition-colors w-full"
                              data-testid="logout-link"
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-hg-text-secondary">
                                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                              </svg>
                              <span className="font-medium">Log out</span>
                            </button>
                          </li>
                        )}
                        {!isLoggedIn && (
                          <li>
                            <LocalizedClientLink
                              href="/apply"
                              className="flex items-center gap-3 px-3 py-3 rounded-lg text-hg-gold hover:bg-hg-gold/5 transition-colors"
                              onClick={close}
                              data-testid="apply-link"
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                <circle cx="8.5" cy="7" r="4" />
                                <line x1="20" y1="8" x2="20" y2="14" />
                                <line x1="23" y1="11" x2="17" y2="11" />
                              </svg>
                              <span className="font-medium">Apply for Membership</span>
                            </LocalizedClientLink>
                          </li>
                        )}
                      </ul>
                    </nav>

                    <div className="px-6 py-4 border-t border-hg-border">
                      <p className="text-xs text-hg-text-secondary/50">
                        © {new Date().getFullYear()} Hops & Glory
                      </p>
                    </div>
                  </div>
                </>,
                document.body
              )}
            </>
          )}
        </Popover>
      </div>
    </div>
  )
}

export default SideMenu
