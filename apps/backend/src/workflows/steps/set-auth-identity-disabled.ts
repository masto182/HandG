import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

type SetAuthDisabledInput = {
  customer_id: string
  disabled: boolean
}

/**
 * Toggles the `disabled` flag on the auth identity(ies) linked to a customer.
 * Used by reject-member / suspend-member / reactivate-member workflows to
 * block or unblock login while preserving the identity record for audit.
 */
export const setAuthIdentityDisabledStep = createStep(
  "set-auth-identity-disabled",
  async (input: SetAuthDisabledInput, { container }) => {
    const authModule = container.resolve(Modules.AUTH) as any

    const identities = await authModule.listAuthIdentities({
      app_metadata: { customer_id: input.customer_id },
    } as any).catch(async () => {
      // Older Medusa minor versions may not accept nested app_metadata filter.
      // Fall back to listing all and filtering client-side.
      const all = await authModule.listAuthIdentities({})
      return all.filter(
        (i: any) => i.app_metadata?.customer_id === input.customer_id
      )
    })

    const previous: Array<{ id: string; disabled: boolean }> = []

    for (const identity of identities as any[]) {
      previous.push({
        id: identity.id,
        disabled: identity.provider_metadata?.disabled === true,
      })
      const nextProviderMeta = {
        ...(identity.provider_metadata || {}),
        disabled: input.disabled,
      }
      await authModule.updateAuthIdentities({
        id: identity.id,
        provider_metadata: nextProviderMeta,
      } as any)
    }

    return new StepResponse<{ count: number }, any>(
      { count: previous.length },
      { previous }
    )
  },
  async (compensationInput: any, { container }) => {
    if (!compensationInput?.previous?.length) return
    const authModule = container.resolve(Modules.AUTH) as any
    for (const entry of compensationInput.previous) {
      await authModule.updateAuthIdentities({
        id: entry.id,
        provider_metadata: { disabled: entry.disabled },
      } as any)
    }
  }
)
