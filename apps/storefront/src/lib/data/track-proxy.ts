import "server-only"
import { sdk } from "@lib/config"
import { getAuthHeaders } from "@lib/data/cookies"

const ALLOWED_PATHS = ["/store/events", "/store/sessions/heartbeat"] as const
export type TrackPath = (typeof ALLOWED_PATHS)[number]

async function post(
  path: TrackPath,
  body: Record<string, unknown>,
  headers: Record<string, string>,
) {
  await sdk.client.fetch(path, { method: "POST", headers, body })
}

export async function forwardTrack(
  path: TrackPath,
  body: Record<string, unknown>,
): Promise<void> {
  if (!ALLOWED_PATHS.includes(path)) return
  const auth = await getAuthHeaders()
  try {
    await post(path, body, auth)
  } catch (err) {
    const status = (err as { status?: number })?.status
    if (status === 401 && "authorization" in auth) {
      try {
        await post(path, body, {})
      } catch {}
    }
  }
}
