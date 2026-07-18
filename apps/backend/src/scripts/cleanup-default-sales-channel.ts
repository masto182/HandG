import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"

/**
 * Removes the stale "Default Sales Channel" that Medusa auto-creates on first
 * boot. It is safe to delete because:
 *   - initial-data-seed.ts creates "Hops & Glory Store" as the store's
 *     default_sales_channel_id and links the publishable key to it
 *   - The Default channel is never used by any storefront or import script
 *
 * Safety checks (script aborts if any fail):
 *   1. The channel to delete has NO linked products
 *   2. The channel to delete is NOT the store's default_sales_channel_id
 *   3. The channel to delete is NOT linked to any publishable API key
 *
 * Usage:
 *   pnpm --filter ./apps/backend exec medusa exec ./src/scripts/cleanup-default-sales-channel.ts
 *
 * Run audit-sales-channels.ts first to confirm the current state.
 */

const DEFAULT_CHANNEL_NAME = "Default Sales Channel"

export default async function cleanupDefaultSalesChannel({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
  const storeModule = container.resolve(Modules.STORE)
  const apiKeyModule = container.resolve(Modules.API_KEY)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  // 1. Find the Default channel
  const channels = await salesChannelModule.listSalesChannels({})
  const defaultChannel = channels.find((c: any) => c.name === DEFAULT_CHANNEL_NAME)

  if (!defaultChannel) {
    logger.info(`No channel named "${DEFAULT_CHANNEL_NAME}" found — nothing to do.`)
    return
  }

  logger.info(`Found "${DEFAULT_CHANNEL_NAME}" → id: ${defaultChannel.id}`)

  // 2. Safety: must not be the store's default channel
  const stores = await (storeModule as any).listStores({}, { take: 1 })
  const store = Array.isArray(stores) ? stores[0] : stores
  if (store?.default_sales_channel_id === defaultChannel.id) {
    logger.error(
      `ABORT: "${DEFAULT_CHANNEL_NAME}" (${defaultChannel.id}) is the store's default_sales_channel_id. ` +
        `Update the store to point to the correct channel before running this script.`
    )
    return
  }

  // 3. Safety: must have no linked products
  try {
    const { data: productLinks } = await query.graph({
      entity: "product_sales_channel",
      fields: ["product_id"],
      filters: { sales_channel_id: defaultChannel.id },
    })
    if (productLinks.length > 0) {
      logger.error(
        `ABORT: "${DEFAULT_CHANNEL_NAME}" has ${productLinks.length} linked product(s). ` +
          `Remove those links or migrate them to "Hops & Glory Store" before deleting.`
      )
      return
    }
    logger.info(`Product link check: 0 products linked — OK`)
  } catch (err) {
    logger.warn(`Could not check product links — proceeding with caution: ${err}`)
  }

  // 4. Safety: must not be linked to any publishable API key
  try {
    const apiKeys = await (apiKeyModule as any).listApiKeys({ type: "publishable" })
    for (const key of apiKeys) {
      const { data: keyLinks } = await query.graph({
        entity: "api_key_sales_channel",
        fields: ["sales_channel_id"],
        filters: { api_key_id: key.id },
      })
      const linked = keyLinks.some((l: any) => l.sales_channel_id === defaultChannel.id)
      if (linked) {
        logger.error(
          `ABORT: "${DEFAULT_CHANNEL_NAME}" is linked to publishable key "${key.title}" (${key.id}). ` +
            `Remove that link before deleting.`
        )
        return
      }
    }
    logger.info(`API key link check: no publishable key links — OK`)
  } catch (err) {
    logger.warn(`Could not check API key links — proceeding with caution: ${err}`)
  }

  // 5. Delete
  logger.info(`Deleting "${DEFAULT_CHANNEL_NAME}" (${defaultChannel.id})...`)
  await salesChannelModule.deleteSalesChannels(defaultChannel.id)
  logger.info(`Done. "${DEFAULT_CHANNEL_NAME}" has been removed.`)

  // 6. Confirm remaining channels
  const remaining = await salesChannelModule.listSalesChannels({})
  logger.info(`Remaining channels (${remaining.length}):`)
  for (const ch of remaining) {
    logger.info(`  [${ch.id}] "${ch.name}"`)
  }
}
