import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"
import { ensurePerServiceShippingOptions } from "../lib/shipping/per-service-options"

/**
 * Create one calculated shipping option per carrier service family and hide the
 * legacy "ShipEngine Live Rates" / "Australia Post Live Rates" options from the
 * storefront. Idempotent.
 *
 * Usage:
 *   npx medusa exec ./src/scripts/create-per-service-shipping-options.ts -- --dry-run
 *   npx medusa exec ./src/scripts/create-per-service-shipping-options.ts
 */
export default async function createPerServiceShippingOptions({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const dryRun = (args ?? []).includes("--dry-run") || process.argv.includes("--dry-run")
  await ensurePerServiceShippingOptions({ container, logger, dryRun })
}
