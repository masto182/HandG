"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { breweryLabel } from "@lib/util/brewery-label"

type Tab = {
  label: string
  href: string
  icon: React.ReactNode
  iconActive: React.ReactNode
}

type MobileBottomNavProps = {
  isApproved: boolean
  isLoggedIn: boolean
}

function StoreIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <polyline points="9 22 9 12 15 12 15 22" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function BreweriesIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
      <path d="M8 2h8l2 4H6l2-4z" />
      <path d="M6 6v6a6 6 0 006 6 6 6 0 006-6V6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  )
}

function CartIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 10a4 4 0 01-8 0" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function AccountIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

export default function MobileBottomNav({ isApproved, isLoggedIn }: MobileBottomNavProps) {
  const pathname = usePathname()

  const tabs: { label: string; href: string; iconKey: string }[] = [
    { label: "Collection", href: "/store", iconKey: "store" },
    { label: breweryLabel(isApproved), href: "/breweries", iconKey: "breweries" },
    { label: "Cart", href: "/cart", iconKey: "cart" },
    { label: "Account", href: "/account", iconKey: "account" },
  ]

  const iconMap: Record<string, (active: boolean) => React.ReactNode> = {
    store: (active) => <StoreIcon active={active} />,
    breweries: (active) => <BreweriesIcon active={active} />,
    cart: (active) => <CartIcon active={active} />,
    account: (active) => <AccountIcon active={active} />,
  }

  return (
    <nav className="small:hidden fixed bottom-0 left-0 w-full z-50 border-t border-hg-border shadow-[0_-4px_20px_rgba(0,0,0,0.2)] flex justify-around items-center px-4 pb-[env(safe-area-inset-bottom)] pt-3 rounded-t-2xl backdrop-blur-xl" style={{ backgroundColor: "color-mix(in srgb, var(--color-bg) 92%, transparent)" }}>
      {tabs.map((tab) => {
        const isActive = pathname === tab.href || (tab.href !== "/" && pathname.startsWith(tab.href))
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center justify-center gap-0.5 transition-all ${
              isActive
                ? "text-hg-gold scale-105"
                : "text-hg-text-secondary/60 active:bg-hg-surface"
            }`}
          >
            {iconMap[tab.iconKey](isActive)}
            <span className="text-[10px] font-bold uppercase tracking-[0.1em]">
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
