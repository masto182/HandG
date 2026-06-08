import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

type SetAuthDisabledInput = {
  customer_id: string
  disabled: boolean
}

/**
 * Toggles the `disabled` flag on the provider identities linked to a customer.
 * Used by reject-member / suspend-member / reactivate-member workflows to
 * block or unblock login while preserving the identity record for audit.
 *
 * NOTE: The `disabled` flag must be set on `provider_identity.provider_metadata`,
 * NOT on `auth_identity`. Medusa's emailpass provider reads
 * `provider_identity.provider_metadata.disabled` at login time.
 */
export const setAuthIdentityDisabledStep = createStep(
  "set-auth-identity-disabled",
  async (input: SetAuthDisabledInput, { container }) => {
    const authModule = container.resolve(Modules.AUTH) as any

    // Step 1: find the auth_identity rows linked to this customer
    const authIdentities = await authModule
      .listAuthIdentities({
        app_metadata: { customer_id: input.customer_id },
      } as any)
      .catch(async () => {
        // Older Medusa minor versions may not accept nested app_metadata filter.
        // Fall back to listing all and filtering client-side.
        const all = await authModule.listAuthIdentities({})
        return all.filter((i: any) => i.app_metadata?.customer_id === input.customer_id)
      })

    const previous: Array<{ id: string; provider_metadata: Record<string, unknown> }> = []

    // Step 2: for each auth_identity, find the linked provider_identity rows
    // and update provider_metadata.disabled on those (not on auth_identity).
    for (const authIdentity of authIdentities as any[]) {
      const providerIdentities = await authModule.listProviderIdentities({
        auth_identity_id: authIdentity.id,
      } as any)

      for (const pi of providerIdentities as any[]) {
        // Save previous state for compensation
        previous.push({
          id: pi.id,
          provider_metadata: pi.provider_metadata || {},
        })

        const nextProviderMeta = {
          ...(pi.provider_metadata || {}),
          disabled: input.disabled,
        }

        await authModule.updateProviderIdentities({
          id: pi.id,
          provider_metadata: nextProviderMeta,
        } as any)
      }
    }

    return new StepResponse<{ count: number }, any>({ count: previous.length }, { previous })
  },
  async (compensationInput: any, { container }) => {
    if (!compensationInput?.previous?.length) return
    const authModule = container.resolve(Modules.AUTH) as any
    for (const entry of compensationInput.previous) {
      await authModule.updateProviderIdentities({
        id: entry.id,
        provider_metadata: entry.provider_metadata,
      } as any)
    }
  }
)
