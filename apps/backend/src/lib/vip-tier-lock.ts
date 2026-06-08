import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * Serialises per-customer VIP tier mutations so that progression (fired by
 * order.payment_captured) and demotion (fired by the daily cron) cannot
 * interleave their read-modify-write of current_tier and clobber each other.
 *
 * Uses a Postgres transaction-scoped advisory lock keyed on the customer id.
 * Both code paths cooperatively acquire the SAME lock before their critical
 * section; the lock auto-releases when the transaction ends. The wrapped work
 * runs while the lock is held (even though the module services use their own
 * pooled connections), giving mutual exclusion.
 */
export async function withVipTierLock<T>(
  container: any,
  customerId: string,
  fn: () => Promise<T>
): Promise<T> {
  let knex: any
  try {
    knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  } catch {
    knex = null
  }

  // No raw connection available (e.g. some unit contexts) -> run without the
  // lock rather than failing the operation.
  if (!knex?.transaction) {
    return fn()
  }

  return knex.transaction(async (trx: any) => {
    // Two-key form namespaces the lock to "vip_tier" to avoid collisions with
    // other advisory-lock users.
    await trx.raw("SELECT pg_advisory_xact_lock(hashtext(?), hashtext('vip_tier'))", [customerId])
    return fn()
  })
}
