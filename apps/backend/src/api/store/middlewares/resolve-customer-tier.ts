import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import type { Tier } from "../../../lib/access/early-access"

const MEMBER_TIERS: ReadonlySet<string> = new Set([
  "approved",
  "vip1",
  "vip2",
  "vip3",
  "vip4",
  "vip5",
])

const NON_MEMBER_GROUPS: ReadonlySet<string> = new Set(["pending", "rejected", "suspended"])

export type ResolvedCustomerTier = Tier | null

/**
 * Resolves the requesting customer's tier (or null for anonymous /
 * pending / rejected / suspended) and attaches it to `req.customer_tier`.
 *
 * This replaces the old accessControlMiddleware's internal getCustomerTier;
 * other middlewares (public redactor, cart-add gate) and route handlers read
 * `req.customer_tier` for their decisions.
 */
export async function resolveCustomerTier(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const actorId = (req as any).auth_context?.actor_id
  let tier: ResolvedCustomerTier = null

  if (actorId) {
    try {
      const customerModule = req.scope.resolve(Modules.CUSTOMER)
      const relations = await customerModule.listCustomerGroupCustomers({
        customer_id: actorId,
      })
      const groupIds = relations.map((r: any) => r.customer_group_id)
      if (groupIds.length) {
        const groups = await customerModule.listCustomerGroups({ id: groupIds })
        const names = new Set(groups.map((g: any) => g.name))

        if ([...names].some((n) => NON_MEMBER_GROUPS.has(n))) {
          tier = null
        } else {
          for (const name of ["vip5", "vip4", "vip3", "vip2", "vip1", "approved"] as const) {
            if (names.has(name)) {
              tier = name
              break
            }
          }
          // If they have no recognised tier group at all, treat as anonymous.
          if (tier && !MEMBER_TIERS.has(tier)) tier = null
        }
      }
    } catch {
      tier = null
    }
  }

  ;(req as any).customer_tier = tier
  return next()
}
