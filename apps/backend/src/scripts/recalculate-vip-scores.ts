import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import evaluateVipProgressionWorkflow from "../workflows/evaluate-vip-progression"

// One-shot backfill: recalculates every customer's vip_score under the current
// formula + window and re-evaluates tier progression. Idempotent; safe to re-run.
//
// Usage:
//   npx medusa exec ./src/scripts/recalculate-vip-scores.ts
export default async function recalculateVipScores({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER) as any
  const customerModule = container.resolve(Modules.CUSTOMER)

  logger.info("[VIP Backfill] Starting full recalculation...")

  let offset = 0
  const limit = 200
  let total = 0
  let failures = 0
  const workflow = evaluateVipProgressionWorkflow(container)

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const customers = await customerModule.listCustomers({}, { skip: offset, take: limit })
    if (!customers.length) break

    for (const customer of customers) {
      try {
        await workflow.run({ input: { customer_id: customer.id } })
        total += 1
      } catch (err) {
        failures += 1
        logger.error(
          `[VIP Backfill] Failed for ${customer.id}: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }

    offset += customers.length
    if (customers.length < limit) break
  }

  logger.info(`[VIP Backfill] Done: ${total} recalculated, ${failures} failures`)
}
