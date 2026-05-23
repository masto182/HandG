"use client"

import { signout } from "@lib/data/customer"
import Icon from "@modules/common/components/icon"

export default function SignOutButton() {
  const handleLogout = async () => {
    await signout()
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface-variant transition-colors hover:border-red-400/50 hover:text-red-400"
      data-testid="profile-logout-button"
    >
      <Icon name="logout" size={18} />
      Sign Out
    </button>
  )
}
