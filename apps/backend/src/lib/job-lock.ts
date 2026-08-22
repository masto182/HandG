import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * Non-blocking job-wide advisory lock: if another process already holds it
 * (an overlapping run of the same scheduled job), returns { skipped: true }
 * immediately instead of piling up concurrent senders. Modeled on
 * lib/vip-tier-lock.ts, but uses pg_try_advisory_xact_lock (non-blocking)
 * rather than pg_advisory_xact_lock (blocking) - a scheduled job should
 * skip the tick and let the next one pick up where the last left off, not
 * queue behind a slow run.
 */
export async function withJobLock<T>(
  container: any,
  jobName: string,
  fn: () => Promise<T>
): Promise<{ skipped: true } | { skipped: false; result: T }> {
  let knex: any
  try {
    knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  } catch {
    knex = null
  }

  if (!knex?.transaction) {
    return { skipped: false, result: await fn() }
  }

  return knex.transaction(async (trx: any) => {
    const result = await trx.raw(
      "SELECT pg_try_advisory_xact_lock(hashtext(?), hashtext('scheduled_job')) as locked",
      [jobName]
    )
    const locked = result?.rows?.[0]?.locked ?? result?.[0]?.[0]?.locked ?? false
    if (!locked) return { skipped: true as const }
    return { skipped: false as const, result: await fn() }
  })
}
