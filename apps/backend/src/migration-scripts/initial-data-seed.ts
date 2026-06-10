import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createSalesChannelsWorkflow,
  createStoresWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} from "@medusajs/medusa/core-flows"

/**
 * Minimal one-shot bootstrap. Only does what seed.ts cannot:
 *   - the Default Store (createStoresWorkflow requires a sales_channel_id)
 *   - the Default Sales Channel (so the store has one to point at)
 *   - the publishable API key (linked to that channel)
 *   - tax regions for the configured country
 *
 * Everything else (region, stock locations, fulfilment sets, shipping options,
 * payment provider link, customer groups, store rename, currency switch) lives
 * in src/scripts/seed.ts so it stays idempotent and re-runnable. The sales
 * channel is created with the brand-aware name seed.ts looks for, so a
 * re-seed reuses it instead of creating a duplicate.
 */
export default async function initial_data_seed({ container }: { container: MedusaContainer }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const storeModule = container.resolve(Modules.STORE)
  const stores = await (storeModule as any).listStores({}, { take: 1 })
  if (Array.isArray(stores) && stores.length > 0) {
    logger.info("Bootstrap: store already exists, skipping initial-data-seed.")
    return
  }

  const BRAND_NAME = process.env.BRAND_NAME || "Hops & Glory"
  const COUNTRY = (process.env.DEFAULT_COUNTRY || "au").toLowerCase()
  const CURRENCY = (process.env.DEFAULT_CURRENCY || "aud").toLowerCase()
  const SALES_CHANNEL_NAME = `${BRAND_NAME} Store`

  logger.info(`Bootstrap: brand="${BRAND_NAME}", country=${COUNTRY}, currency=${CURRENCY}`)

  const {
    result: [defaultSalesChannel],
  } = await createSalesChannelsWorkflow(container).run({
    input: {
      salesChannelsData: [
        {
          name: SALES_CHANNEL_NAME,
          description: "Primary online sales channel",
        },
      ],
    },
  })

  const {
    result: [publishableApiKey],
  } = await createApiKeysWorkflow(container).run({
    input: {
      api_keys: [
        {
          title: "Default Publishable API Key",
          type: "publishable",
          created_by: "",
        },
      ],
    },
  })

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableApiKey.id,
      add: [defaultSalesChannel.id],
    },
  })

  await createStoresWorkflow(container).run({
    input: {
      stores: [
        {
          name: BRAND_NAME,
          supported_currencies: [
            {
              currency_code: CURRENCY,
              is_default: true,
            },
          ],
          default_sales_channel_id: defaultSalesChannel.id,
        },
      ],
    },
  })

  await createTaxRegionsWorkflow(container).run({
    input: [{ country_code: COUNTRY, provider_id: "tp_system" }],
  })

  logger.info("Bootstrap complete. Run seed.ts to populate region, locations, fulfilment, payment.")
}
