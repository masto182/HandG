/**
 * Admin REST helpers — used ONLY for cleanup / teardown.
 *
 * Per the operator's clarification: the UI must demonstrate the workflow
 * (apply, approve, buy-at-price approve, capture payment, …) but cleanup of
 * test customers/orders/wishlist rows can go through the API. This file is
 * the single place the suite is allowed to bypass the UI for those cleanup
 * operations.
 */

const BACKEND = process.env.PLAYWRIGHT_BACKEND_URL || "http://localhost:9000"
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "admin@example.test"
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "ChangeMe123!"

let cachedToken: string | null = null

export async function getAdminToken(): Promise<string> {
  if (cachedToken) return cachedToken
  const res = await fetch(`${BACKEND}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  if (!res.ok) {
    throw new Error(`Admin login failed: ${res.status} ${await res.text()}`)
  }
  const json = (await res.json()) as { token?: string }
  if (!json.token) throw new Error("No token in admin login response")
  cachedToken = json.token
  return cachedToken
}

async function adminFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await getAdminToken()
  return fetch(`${BACKEND}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function findCustomerIdByEmail(
  email: string,
): Promise<string | null> {
  const res = await adminFetch(
    `/admin/customers?q=${encodeURIComponent(email)}&limit=20`,
  )
  if (!res.ok) return null
  const j = (await res.json()) as {
    customers?: Array<{ id: string; email: string }>
  }
  const match = j.customers?.find(
    (c) => c.email.toLowerCase() === email.toLowerCase(),
  )
  return match?.id ?? null
}

export async function deleteCustomerByEmail(email: string): Promise<void> {
  const id = await findCustomerIdByEmail(email)
  if (!id) return
  await adminFetch(`/admin/customers/${id}`, { method: "DELETE" }).catch(
    () => {},
  )
}

export async function deleteWishlistEntriesForCustomer(
  email: string,
): Promise<void> {
  const id = await findCustomerIdByEmail(email)
  if (!id) return
  const res = await adminFetch(`/admin/wishlist?customer_id=${id}&limit=100`)
  if (!res.ok) return
  const j = (await res.json()) as { wishlists?: Array<{ id: string }> }
  for (const row of j.wishlists ?? []) {
    await adminFetch(`/admin/wishlist/${row.id}`, { method: "DELETE" }).catch(
      () => {},
    )
  }
}

export async function approveCustomerByEmail(email: string): Promise<void> {
  let id: string | null = null
  for (let attempt = 0; attempt < 30; attempt++) {
    id = await findCustomerIdByEmail(email)
    if (id) break
    await new Promise((r) => setTimeout(r, 2000))
  }
  if (!id)
    throw new Error(`Customer not found for approval after retries: ${email}`)
  const res = await adminFetch(`/admin/members/${id}/approve`, {
    method: "POST",
  })
  if (!res.ok) {
    throw new Error(
      `Approve failed for ${email}: ${res.status} ${await res.text()}`,
    )
  }
}
