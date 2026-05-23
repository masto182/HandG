import { MedusaContainer } from "@medusajs/framework/types"

export default async function untappdSync(container: MedusaContainer) {
  const logger = container.resolve("logger") as any

  logger.info("[Untappd Sync] Starting daily sync...")
  logger.info("[Untappd Sync] STUBBED — awaiting venue confirmation and API credentials")
  logger.info("[Untappd Sync] Complete (no-op)")
}

export const config = {
  name: "untappd-sync",
  schedule: "0 17 * * *",
}
