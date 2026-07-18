import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"

/**
 * Audits the current sales channel configuration on this instance.
 *
 * Prints:
 *   - All sales channels (id, name, is_disabled)
 *   - Which publishable API key(s) exist and which channels they are linked to
 *   - The store's default_sales_channel_id
 *   - The number of products linked to each channel
 *
 * Usage:
 *   pnpm --filter ./apps/backend exec medusa exec ./src/scripts/audit-sales-channels.ts
 */

export default async function auditSalesChannels({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
  const storeModule = container.resolve(Modules.STORE)
  const apiKeyModule = container.resolve(Modules.API_KEY)
  const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  logger.info("=== Sales Channel Audit ===\n")

  // 1. List all sales channels
  const channels = await salesChannelModule.listSalesChannels({})
  logger.info(`Found ${channels.length} sales channel(s):`)
  for (const ch of channels) {
    logger.info(`  [${ch.id}] "${ch.name}" — disabled: ${ch.is_disabled}`)
  }

  // 2. Store default channel
  const stores = await (storeModule as any).listStores({}, { take: 1 })
  const store = Array.isArray(stores) ? stores[0] : stores
  if (store) {
    const defaultId = store.default_sales_channel_id
    const defaultCh = channels.find((c: any) => c.id === defaultId)
    logger.info(
      `\nStore default_sales_channel_id: ${defaultId} → "${defaultCh?.name ?? "NOT FOUND"}"`
    )
  } else {
    logger.warn("\nNo store found.")
  }

  // 3. Publishable API keys and their channel links
  const apiKeys = await (apiKeyModule as any).listApiKeys({ type: "publishable" })
  logger.info(`\nPublishable API keys (${apiKeys.length}):`)
  for (const key of apiKeys) {
    logger.info(`  [${key.id}] "${key.title}" — redacted: ${key.redacted}`)
    try {
      const { data: links } = await query.graph({
        entity: "api_key_sales_channel",
        fields: ["sales_channel_id"],
        filters: { api_key_id: key.id },
      })
      const linkedChannelIds = links.map((l: any) => l.sales_channel_id)
      const linkedNames = linkedChannelIds.map((id: string) => {
        const ch = channels.find((c: any) => c.id === id)
        return `"${ch?.name ?? id}"`
      })
      logger.info(`    → linked channels: ${linkedNames.join(", ") || "(none)"}`)
    } catch {
      logger.info(`    → (could not resolve channel links)`)
    }
  }

  // 4. Product counts per channel
  logger.info("\nProduct counts per channel:")
  for (const ch of channels) {
    try {
      const { data: scLinks } = await query.graph({
        entity: "product_sales_channel",
        fields: ["product_id"],
        filters: { sales_channel_id: ch.id },
      })
      logger.info(`  "${ch.name}": ${scLinks.length} product(s)`)
    } catch {
      logger.info(`  "${ch.name}": (could not count products)`)
    }
  }

  logger.info("\n=== End Audit ===")
}
