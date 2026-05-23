import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect, useState } from "react"

type PendingCustomer = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  metadata: any
  created_at: string
}

const MembershipQueue = () => {
  const [pending, setPending] = useState<PendingCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState<string | null>(null)

  const fetchPending = async () => {
    try {
      const res = await fetch("/admin/membership", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setPending(data.pending || [])
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchPending() }, [])

  const handleAction = async (customerId: string, action: "approve" | "reject") => {
    setActioning(customerId)
    try {
      await fetch(`/admin/membership/${customerId}/${action}`, {
        method: "POST",
        credentials: "include",
      })
      setPending(pending.filter((c) => c.id !== customerId))
    } catch {}
    setActioning(null)
  }

  if (loading) return <div>Loading applications...</div>

  return (
    <div>
      <h2 style={{ marginBottom: "16px", fontSize: "16px", fontWeight: 600 }}>
        Membership Applications ({pending.length})
      </h2>
      {pending.length === 0 ? (
        <p style={{ color: "#666" }}>No pending applications.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {pending.map((customer) => (
            <div
              key={customer.id}
              style={{
                padding: "16px",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ fontWeight: 500 }}>
                    {customer.first_name} {customer.last_name}
                  </p>
                  <p style={{ fontSize: "13px", color: "#666" }}>{customer.email}</p>
                  {customer.metadata?.why_join && (
                    <p style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                      &ldquo;{customer.metadata.why_join}&rdquo;
                    </p>
                  )}
                  {customer.metadata?.favourite_brewery && (
                    <p style={{ fontSize: "12px", color: "#888" }}>
                      Favourite: {customer.metadata.favourite_brewery}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => handleAction(customer.id, "approve")}
                    disabled={actioning === customer.id}
                    style={{
                      padding: "6px 16px",
                      background: "#16a34a",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(customer.id, "reject")}
                    disabled={actioning === customer.id}
                    style={{
                      padding: "6px 16px",
                      background: "#dc2626",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export const config = defineWidgetConfig({
  zone: "order.list.before",
})

export default MembershipQueue
