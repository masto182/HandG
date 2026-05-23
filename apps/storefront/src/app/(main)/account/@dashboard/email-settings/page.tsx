import { sdk } from "@lib/config"
import { getAuthHeaders } from "@lib/data/cookies"
import EmailSettingsToggleList, {
  type PreferenceEntry,
} from "@modules/account/components/email-settings-toggle-list"

type PreferencesResponse = { preferences: PreferenceEntry[] }

async function fetchPreferences(): Promise<PreferenceEntry[] | null> {
  try {
    const headers = await getAuthHeaders()
    const res = await sdk.client.fetch<PreferencesResponse>(
      "/store/customers/me/notifications/preferences",
      { method: "GET", headers, next: { revalidate: 0 } }
    )
    return res?.preferences ?? null
  } catch {
    return null
  }
}

export default async function EmailSettingsPage() {
  const preferences = await fetchPreferences()
  if (!preferences) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-light mb-2">Email Settings</h1>
        <p className="text-sm text-neutral-500">
          We couldn&apos;t load your preferences. Please refresh.
        </p>
      </div>
    )
  }
  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-light mb-1">Email Settings</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Choose which emails you&apos;d like to receive. Order and account
        notifications cannot be disabled.
      </p>
      <EmailSettingsToggleList initial={preferences} />
    </div>
  )
}
