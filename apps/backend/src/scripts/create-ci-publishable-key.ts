import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

const SALES_CHANNEL_NAME = `${process.env.BRAND_NAME || "Hops & Glory"} Store`

/**
 * Creates a publishable API key for the CI E2E suite, links it to the default
 * sales channel, and writes the token to stdout as:
 *
 *   NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...
 *
 * The CI workflow greps for this line and appends it to $GITHUB_ENV.
 *
 * Usage:
 *   pnpm --filter ./apps/backend exec medusa exec ./src/scripts/create-ci-publishable-key.ts
 */
export default async function createCiPublishableKey({ container }: ExecArgs) {
  const apiKeyModule = container.resolve(Modules.API_KEY)
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
  const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK)

  const [salesChannel] = await salesChannelModule.listSalesChannels({
    name: SALES_CHANNEL_NAME,
  })
  if (!salesChannel) {
    throw new Error(`Sales channel "${SALES_CHANNEL_NAME}" not found — run seed first`)
  }

  const apiKey = await apiKeyModule.createApiKeys({
    title: "CI E2E",
    type: "publishable",
    created_by: null,
  })

  try {
    await remoteLink.create({
      [Modules.SALES_CHANNEL]: { sales_channel_id: salesChannel.id },
      [Modules.API_KEY]: { publishable_key_id: apiKey.id },
    })
  } catch (e: any) {
    if (!e.message?.includes("already exists")) throw e
  }

  // Single output line for the CI step to capture via grep
  process.stdout.write(`NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=${apiKey.token}\n`)
}
