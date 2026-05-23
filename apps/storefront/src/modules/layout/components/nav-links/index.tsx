"use client"

import { usePathname } from "next/navigation"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { breweryLabel } from "@lib/util/brewery-label"

export default function NavLinks({ isApproved = false }: { isApproved?: boolean }) {
  const pathname = usePathname()

  const links = [
    { label: "The Collection", href: "/store" },
    { label: breweryLabel(isApproved), href: "/breweries" },
  ]

  return (
    <div className="hidden small:flex items-center gap-8">
      {links.map((link) => {
        const isActive = pathname === link.href || pathname.startsWith(link.href + "/") || (link.href === "/store" && pathname === "/store")
        return (
          <LocalizedClientLink
            key={link.href}
            href={link.href}
            className={`text-sm font-medium transition-colors ${
              isActive
                ? "text-hg-gold border-b-2 border-hg-gold pb-0.5"
                : "text-hg-text-secondary hover:text-hg-text"
            }`}
          >
            {link.label}
          </LocalizedClientLink>
        )
      })}
    </div>
  )
}
