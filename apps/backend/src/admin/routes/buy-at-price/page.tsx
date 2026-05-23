import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Input,
  Button,
  Badge,
  Table,
  Checkbox,
} from "@medusajs/ui"
import { useEffect, useState } from "react"
import { sdk } from "../../lib/sdk"

type WishlistRow = {
  id: string
  customer_id: string
  product_id: string
  target_price: number | null
  admin_approved_offer: boolean
  admin_offer_price: number | null
  admin_offer_expires_at: string | null
  customer_email?: string
  product_title?: string
  current_price?: number | null
}

const fmt = (amount: number | null | undefined, currency = "AUD") =>
  amount == null
    ? "—"
    : new Intl.NumberFormat("en-AU", {
        style: "currency",
        currency,
      }).format(amount)

const BuyAtPricePage = () => {
  const [rows, setRows] = useState<WishlistRow[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [offerOverrides, setOfferOverrides] = useState<Record<string, number>>({})
  const [expiresDays, setExpiresDays] = useState<number>(14)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await sdk.client.fetch<{ wishlists: WishlistRow[] }>(
        `/admin/wishlist?mode=buy_at_price&pending=true`,
        { method: "GET" }
      )
      setRows(res.wishlists || [])
    } catch (e: any) {
      setError(e?.message || "Failed to load wishlist")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const approveSelected = async () => {
    if (!selected.size) return
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const expires = new Date(
        Date.now() + expiresDays * 24 * 60 * 60 * 1000
      ).toISOString()
      const approvals = rows
        .filter((r) => selected.has(r.id))
        .map((r) => ({
          wishlist_id: r.id,
          customer_id: r.customer_id,
          product_id: r.product_id,
          offer_price:
            offerOverrides[r.id] ?? r.target_price ?? 0,
          expires_at: expires,
        }))
      const res = await sdk.client.fetch<any>(
        `/admin/wishlist/approve-offers-batch`,
        {
          method: "POST",
          body: { approvals, currency_code: "aud" },
        }
      )
      setMessage(
        `Approved ${res.approved} item(s) for ${res.customers} customer(s); ${res.promotions} promotion(s) created.`
      )
      setSelected(new Set())
      setOfferOverrides({})
      await load()
    } catch (e: any) {
      setError(e?.message || "Approval failed")
    } finally {
      setLoading(false)
    }
  }

  const revoke = async (id: string) => {
    if (!confirm("Revoke this approved offer?")) return
    setLoading(true)
    setError(null)
    try {
      await sdk.client.fetch(`/admin/wishlist/${id}`, { method: "DELETE" })
      await load()
    } catch (e: any) {
      setError(e?.message || "Revoke failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container className="p-8">
      <Heading level="h1">Buy-at-Price</Heading>
      <p className="text-ui-fg-subtle mt-2 mb-6">
        Review pending customer offers and approve in batch. Approved offers create
        a Medusa campaign with auto-promotions that lock the delta from the current
        price.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-ui-bg-base border border-ui-border-error rounded">
          <Badge color="red">Error</Badge> {error}
        </div>
      )}
      {message && (
        <div className="mb-4 p-3 bg-ui-bg-base border border-ui-border-base rounded">
          <Badge color="green">OK</Badge> {message}
        </div>
      )}

      <div className="flex items-center gap-4 mb-4">
        <label className="flex items-center gap-2">
          <span className="text-sm">Expires in (days)</span>
          <Input
            type="number"
            min={1}
            max={90}
            value={expiresDays}
            onChange={(e) => setExpiresDays(parseInt(e.target.value, 10) || 14)}
            className="w-24"
          />
        </label>
        <Button
          variant="primary"
          onClick={approveSelected}
          disabled={!selected.size || loading}
        >
          Approve {selected.size} selected
        </Button>
        <Button variant="secondary" onClick={load} disabled={loading}>
          Refresh
        </Button>
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell />
            <Table.HeaderCell>Customer</Table.HeaderCell>
            <Table.HeaderCell>Product</Table.HeaderCell>
            <Table.HeaderCell>Current price</Table.HeaderCell>
            <Table.HeaderCell>Customer offer</Table.HeaderCell>
            <Table.HeaderCell>Counter-offer</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rows.map((r) => (
            <Table.Row key={r.id}>
              <Table.Cell>
                <Checkbox
                  checked={selected.has(r.id)}
                  onCheckedChange={() => toggle(r.id)}
                  disabled={r.admin_approved_offer}
                />
              </Table.Cell>
              <Table.Cell>
                {r.customer_email || r.customer_id.slice(-8)}
              </Table.Cell>
              <Table.Cell>{r.product_title || r.product_id.slice(-8)}</Table.Cell>
              <Table.Cell>{fmt(r.current_price)}</Table.Cell>
              <Table.Cell>{fmt(r.target_price)}</Table.Cell>
              <Table.Cell>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={fmt(r.target_price)}
                  value={
                    offerOverrides[r.id] != null
                      ? offerOverrides[r.id]
                      : ""
                  }
                  onChange={(e) => {
                    const v = parseFloat(e.target.value)
                    setOfferOverrides((m) => ({
                      ...m,
                      [r.id]: isNaN(v) ? 0 : v,
                    }))
                  }}
                  className="w-28"
                  disabled={r.admin_approved_offer}
                />
              </Table.Cell>
              <Table.Cell>
                {r.admin_approved_offer ? (
                  <Badge color="green">Approved</Badge>
                ) : (
                  <Badge color="grey">Pending</Badge>
                )}
              </Table.Cell>
              <Table.Cell>
                {r.admin_approved_offer && (
                  <Button
                    size="small"
                    variant="danger"
                    onClick={() => revoke(r.id)}
                  >
                    Revoke
                  </Button>
                )}
              </Table.Cell>
            </Table.Row>
          ))}
          {!rows.length && !loading && (
            <Table.Row>
              <Table.Cell colSpan={8}>
                <div className="text-ui-fg-subtle p-4 text-center">
                  No pending buy-at-price offers.
                </div>
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Buy-at-Price",
  icon: undefined,
})

export default BuyAtPricePage
