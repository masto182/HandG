import type { MedusaContainer } from "@medusajs/framework"

/**
 * Creates an admin user and returns auth headers with a session token that
 * carries an actor_id (required by /admin/* routes).
 *
 * The previous inline pattern in these specs registered an auth identity and
 * created a user separately but never LINKED them, so the login token had no
 * actor_id and every /admin request returned 401. The fix is step 3: set
 * app_metadata.user_id on the auth identity before logging in.
 */
export async function createAdminAuth(
  api: { post: (path: string, body: unknown, opts?: unknown) => Promise<{ data: unknown }> },
  container: MedusaContainer
): Promise<{ headers: Record<string, string> }> {
  const userModule = container.resolve("user") as any
  const authModule = container.resolve("auth") as any

  const email = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.dev`
  const password = "Admin123!"

  // 1. Register: creates an auth identity + emailpass provider identity (hashed pw).
  await api.post("/auth/user/emailpass/register", { email, password })

  // 2. Create the admin user.
  const user = await userModule.createUsers({
    email,
    first_name: "Test",
    last_name: "Admin",
  })

  // 3. Link the auth identity to the user so the session token carries actor_id.
  const authIdentities = await authModule.listAuthIdentities(
    {},
    { relations: ["provider_identities"] }
  )
  const identity = authIdentities.find((ai: any) =>
    (ai.provider_identities ?? []).some((pi: any) => pi.entity_id === email)
  )
  if (identity) {
    await authModule.updateAuthIdentities({
      id: identity.id,
      app_metadata: { user_id: user.id },
    })
  }

  // 4. Login: token now resolves to the admin actor.
  const auth = await api.post("/auth/user/emailpass", { email, password })
  return {
    headers: { authorization: `Bearer ${(auth.data as any).token}` },
  }
}
