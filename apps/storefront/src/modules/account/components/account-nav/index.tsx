"use client"

import { clx } from "@modules/common/components/ui"
import { useParams, usePathname } from "next/navigation"
import { signout } from "@lib/data/customer"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Icon from "@modules/common/components/icon"

const navLinks = [
  { href: "/account", label: "Overview", icon: "dashboard" },
  { href: "/account/wishlist", label: "Wishlist", icon: "favorite" },
  { href: "/account/orders", label: "Orders", icon: "shopping_bag" },
  { href: "/account/addresses", label: "Addresses", icon: "location_on" },
  { href: "/account/profile", label: "Profile", icon: "person" },
  { href: "/account/vip", label: "VIP", icon: "military_tech" },
  { href: "/account/alerts", label: "Restock Alerts", icon: "notifications_active" },
  { href: "/account/referrals", label: "Referrals", icon: "group" },
  { href: "/account/email-settings", label: "Email Settings", icon: "mail" },
]

const AccountNav = ({
  customer,
  mobile = false,
}: {
  customer: HttpTypes.StoreCustomer | null
  mobile?: boolean
}) => {
  const route = usePathname()
  const { countryCode } = useParams() as { countryCode: string }

  const handleLogout = async () => {
    await signout(countryCode)
  }

  const isActive = (href: string) => {
    const routeSegment = countryCode ? route.split(countryCode)[1] : route
    return routeSegment === href || (href === "/account" && routeSegment === "/account/")
  }

  const initial = customer?.first_name?.charAt(0)?.toUpperCase() || "?"
  const displayName = [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || "Member"
  const tier = (customer?.metadata as Record<string, string> | null)?.membership_status || "approved"
  const tierLabel = tier.startsWith("vip") ? `VIP Tier ${tier.replace("vip", "")}` : "Member"

  if (mobile) {
    return (
      <div className="overflow-x-auto no-scrollbar -mx-4 px-4">
        <div className="flex items-center gap-2 min-w-max">
          {navLinks.map((link) => (
            <LocalizedClientLink
              key={link.href}
              href={link.href}
              className={clx("px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors border flex items-center gap-1.5", {
                "bg-hl-primary text-white font-medium border-hl-primary": isActive(link.href),
                "border-outline-variant text-on-surface-variant hover:text-on-surface hover:border-outline": !isActive(link.href),
              })}
            >
              <Icon name={link.icon} size={16} filled={isActive(link.href)} />
              {link.label}
            </LocalizedClientLink>
          ))}
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 text-sm rounded-lg whitespace-nowrap border border-outline-variant text-on-surface-variant hover:text-red-400 hover:border-red-400/30 transition-colors flex items-center gap-1.5"
          >
            <Icon name="logout" size={16} />
            Log out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full" data-testid="account-nav">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-9 w-9 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-on-primary-container">{initial}</span>
        </div>
        <div className="overflow-hidden">
          <p className="text-sm font-semibold text-on-surface truncate">{displayName}</p>
          <span className="text-[10px] font-medium text-on-surface-variant uppercase tracking-wider">
            {tierLabel}
          </span>
        </div>
      </div>

      <ul className="flex flex-col gap-y-0.5 flex-1">
        {navLinks.map((link) => (
          <li key={link.href}>
            <LocalizedClientLink
              href={link.href}
              className={clx("flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all", {
                "bg-hl-primary text-white font-medium": isActive(link.href),
                "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface": !isActive(link.href),
              })}
              data-testid={`${link.label.toLowerCase().replace(/\s/g, "-")}-link`}
            >
              <Icon name={link.icon} size={18} filled={isActive(link.href)} />
              {link.label}
            </LocalizedClientLink>
          </li>
        ))}
      </ul>

      <div className="border-t border-outline-variant/50 pt-3 mt-3">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-on-surface-variant hover:text-red-400 transition-colors"
          data-testid="logout-button"
        >
          <Icon name="logout" size={18} />
          Sign Out
        </button>
      </div>
    </div>
  )
}

export default AccountNav
