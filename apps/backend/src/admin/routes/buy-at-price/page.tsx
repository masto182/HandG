import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Input,
  Button,
  Badge,
  Table,
  Checkbox,
  Tabs,
  FocusModal,
  Label,
  Text,
  toast,
  usePrompt,
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
  customer_tier?: string
  product_title?: string
  current_price?: number | null
  stock?: number | null
}

const fmt = (amount: number | null | undefined, currency = "AUD") =>
  amount == null
    ? "—"
    : new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(amount)

const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString("en-AU", { day: "numeric", month: "short" }) : "—"

const tierColor = (tier?: string): "grey" | "blue" | "purple" | "orange" => {
  if (!tier || tier === "approved" || tier === "none") return "grey"
  const n = parseInt(tier.replace(/\D/g, ""), 10) || 0
  if (n >= 4) return "orange"
  if (n >= 2) return "purple"
  return "blue"
}
const tierLabel = (tier?: string) =>
  !tier || tier === "approved" || tier === "none" ? "Member" : tier.toUpperCase()

const discountPct = (current?: number | null, offer?: number | null) =>
  current && offer != null && current > 0 ? Math.round((1 - offer / current) * 100) : null

function StockBadge({ stock }: { stock?: number | null }) {
  if (stock == null)
    return (
      <Text size="small" className="text-ui-fg-muted">
        —
      </Text>
    )
  if (stock <= 0)
    return (
      <Badge size="2xsmall" color="red">
        Sold out
      </Badge>
    )
  if (stock <= 6)
    return (
      <Badge size="2xsmall" color="orange">
        Low: {stock}
      </Badge>
    )
  return (
    <Badge size="2xsmall" color="grey">
      {stock}
    </Badge>
  )
}

const BuyAtPricePage = () => {
  const [rows, setRows] = useState<WishlistRow[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [offerOverrides, setOfferOverrides] = useState<Record<string, number>>({})
  const [expiresDays, setExpiresDays] = useState<number>(14)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const prompt = usePrompt()

  const load = async () => {
    setLoading(true)
    try {
      const res = await sdk.client.fetch<{ wishlists: WishlistRow[] }>(
        `/admin/wishlist?mode=buy_at_price`
      )
      setRows(res.wishlists || [])
    } catch (e: any) {
      toast.error(e?.message || "Failed to load offers")
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
  }, [])

  const pending = rows.filter((r) => !r.admin_approved_offer)
  const approved = rows.filter((r) => r.admin_approved_offer)

  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  const selectedRows = pending.filter((r) => selected.has(r.id))

  const confirmApprove = async () => {
    if (!selectedRows.length) return
    // Validate all prices are > 0 before approving
    const invalidRows = selectedRows.filter((r) => {
      const price = offerOverrides[r.id] ?? r.target_price ?? 0
      return !price || price <= 0
    })
    if (invalidRows.length > 0) {
      toast.error(
        `Counter-offer price must be greater than $0 for all offers. ${invalidRows.length} offer(s) have an invalid price.`
      )
      return
    }
    setSaving(true)
    try {
      const expires = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString()
      const approvals = selectedRows.map((r) => ({
        wishlist_id: r.id,
        customer_id: r.customer_id,
        product_id: r.product_id,
        offer_price: offerOverrides[r.id] ?? r.target_price ?? 0,
        expires_at: expires,
      }))
      const res = await sdk.client.fetch<any>(`/admin/wishlist/approve-offers-batch`, {
        method: "POST",
        body: { approvals, currency_code: "aud" },
      })
      toast.success(
        `Approved ${res.approved} offer(s) for ${res.customers} customer(s); ${res.promotions} promotion(s) created.`
      )
      setSelected(new Set())
      setOfferOverrides({})
      setReviewOpen(false)
      load()
    } catch (e: any) {
      toast.error(e?.message || "Approval failed")
    } finally {
      setSaving(false)
    }
  }

  const revoke = async (r: WishlistRow) => {
    const ok = await prompt({
      title: "Revoke approved offer?",
      description: `Removes the locked price for ${r.product_title || "this product"}.`,
      confirmText: "Revoke",
      cancelText: "Cancel",
      variant: "danger",
    })
    if (!ok) return
    try {
      await sdk.client.fetch(`/admin/wishlist/${r.id}`, { method: "DELETE" })
      toast.success("Offer revoked")
      load()
    } catch (e: any) {
      toast.error(e?.message || "Revoke failed")
    }
  }

  const PendingTable = (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell className="w-10" />
          <Table.HeaderCell>Member</Table.HeaderCell>
          <Table.HeaderCell>Product</Table.HeaderCell>
          <Table.HeaderCell>Stock</Table.HeaderCell>
          <Table.HeaderCell>Current</Table.HeaderCell>
          <Table.HeaderCell>Their offer</Table.HeaderCell>
          <Table.HeaderCell>Discount</Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {pending.map((r) => {
          const pct = discountPct(r.current_price, r.target_price)
          return (
            <Table.Row key={r.id}>
              <Table.Cell onClick={(e) => e.stopPropagation()}>
                <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />
              </Table.Cell>
              <Table.Cell>
                <div className="flex items-center gap-2">
                  <Badge size="2xsmall" color={tierColor(r.customer_tier)}>
                    {tierLabel(r.customer_tier)}
                  </Badge>
                  <span className="text-sm">{r.customer_email || r.customer_id.slice(-8)}</span>
                </div>
              </Table.Cell>
              <Table.Cell className="font-medium">
                {r.product_title || r.product_id.slice(-8)}
              </Table.Cell>
              <Table.Cell>
                <StockBadge stock={r.stock} />
              </Table.Cell>
              <Table.Cell>{fmt(r.current_price)}</Table.Cell>
              <Table.Cell>{fmt(r.target_price)}</Table.Cell>
              <Table.Cell>
                {pct == null ? (
                  "—"
                ) : (
                  <Badge size="2xsmall" color={pct >= 30 ? "red" : pct >= 15 ? "orange" : "green"}>
                    {pct}% off
                  </Badge>
                )}
              </Table.Cell>
            </Table.Row>
          )
        })}
        {!pending.length && !loading && (
          <Table.Row>
            <Table.Cell colSpan={7}>
              <div className="text-center text-ui-fg-muted py-8">No pending offers.</div>
            </Table.Cell>
          </Table.Row>
        )}
      </Table.Body>
    </Table>
  )

  const ApprovedTable = (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>Member</Table.HeaderCell>
          <Table.HeaderCell>Product</Table.HeaderCell>
          <Table.HeaderCell>Locked price</Table.HeaderCell>
          <Table.HeaderCell>Current</Table.HeaderCell>
          <Table.HeaderCell>Expires</Table.HeaderCell>
          <Table.HeaderCell />
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {approved.map((r) => (
          <Table.Row key={r.id}>
            <Table.Cell>
              <div className="flex items-center gap-2">
                <Badge size="2xsmall" color={tierColor(r.customer_tier)}>
                  {tierLabel(r.customer_tier)}
                </Badge>
                <span className="text-sm">{r.customer_email || r.customer_id.slice(-8)}</span>
              </div>
            </Table.Cell>
            <Table.Cell className="font-medium">
              {r.product_title || r.product_id.slice(-8)}
            </Table.Cell>
            <Table.Cell>
              <Badge color="green">{fmt(r.admin_offer_price ?? r.target_price)}</Badge>
            </Table.Cell>
            <Table.Cell>{fmt(r.current_price)}</Table.Cell>
            <Table.Cell className="text-sm text-ui-fg-subtle">
              {fmtDate(r.admin_offer_expires_at)}
            </Table.Cell>
            <Table.Cell>
              <div className="flex justify-end">
                <Button size="small" variant="danger" onClick={() => revoke(r)}>
                  Revoke
                </Button>
              </div>
            </Table.Cell>
          </Table.Row>
        ))}
        {!approved.length && !loading && (
          <Table.Row>
            <Table.Cell colSpan={6}>
              <div className="text-center text-ui-fg-muted py-8">No approved offers.</div>
            </Table.Cell>
          </Table.Row>
        )}
      </Table.Body>
    </Table>
  )

  return (
    <Container>
      <Heading level="h1" className="mb-1">
        Buy-at-Price
      </Heading>
      <Text size="small" className="text-ui-fg-subtle mb-4 block">
        Approve member offers in batch. Approving locks the delta from the current price via a
        Medusa promotion.
      </Text>

      <Tabs defaultValue="pending">
        <div className="flex items-center justify-between">
          <Tabs.List>
            <Tabs.Trigger value="pending">
              Pending{" "}
              {pending.length > 0 && (
                <Badge size="2xsmall" className="ml-1">
                  {pending.length}
                </Badge>
              )}
            </Tabs.Trigger>
            <Tabs.Trigger value="approved">
              Approved{" "}
              {approved.length > 0 && (
                <Badge size="2xsmall" className="ml-1">
                  {approved.length}
                </Badge>
              )}
            </Tabs.Trigger>
          </Tabs.List>
          <Button variant="secondary" size="small" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </div>

        <Tabs.Content value="pending" className="pt-4">
          {selected.size > 0 && (
            <div className="flex items-center justify-between px-3 py-2 mb-3 bg-ui-bg-subtle border border-ui-border-base rounded-md">
              <Text size="small" weight="plus">
                {selected.size} selected
              </Text>
              <Button size="small" onClick={() => setReviewOpen(true)}>
                Review &amp; approve {selected.size}
              </Button>
            </div>
          )}
          {PendingTable}
        </Tabs.Content>

        <Tabs.Content value="approved" className="pt-4">
          {ApprovedTable}
        </Tabs.Content>
      </Tabs>

      {/* Review FocusModal */}
      <FocusModal open={reviewOpen} onOpenChange={setReviewOpen}>
        <FocusModal.Content>
          <FocusModal.Header>
            <Text weight="plus">Review {selectedRows.length} offer(s)</Text>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="small" onClick={() => setReviewOpen(false)}>
                Cancel
              </Button>
              <Button size="small" onClick={confirmApprove} isLoading={saving} disabled={saving}>
                Approve all
              </Button>
            </div>
          </FocusModal.Header>
          <FocusModal.Body className="overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="flex items-center gap-2">
                <Label size="small" weight="plus">
                  Offers expire in
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={expiresDays}
                  onChange={(e) => setExpiresDays(parseInt(e.target.value, 10) || 14)}
                  className="w-20"
                />
                <Text size="small" className="text-ui-fg-muted">
                  days
                </Text>
              </div>

              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Member</Table.HeaderCell>
                    <Table.HeaderCell>Product</Table.HeaderCell>
                    <Table.HeaderCell>Current</Table.HeaderCell>
                    <Table.HeaderCell>Counter-offer</Table.HeaderCell>
                    <Table.HeaderCell>Discount</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {selectedRows.map((r) => {
                    const offer = offerOverrides[r.id] ?? r.target_price ?? 0
                    const pct = discountPct(r.current_price, offer)
                    return (
                      <Table.Row key={r.id}>
                        <Table.Cell>
                          <div className="flex items-center gap-2">
                            <Badge size="2xsmall" color={tierColor(r.customer_tier)}>
                              {tierLabel(r.customer_tier)}
                            </Badge>
                            <span className="text-sm">
                              {r.customer_email || r.customer_id.slice(-8)}
                            </span>
                          </div>
                        </Table.Cell>
                        <Table.Cell className="font-medium">
                          {r.product_title || r.product_id.slice(-8)}
                        </Table.Cell>
                        <Table.Cell>{fmt(r.current_price)}</Table.Cell>
                        <Table.Cell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={offerOverrides[r.id] ?? r.target_price ?? ""}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value)
                              setOfferOverrides((m) => ({ ...m, [r.id]: isNaN(v) ? 0 : v }))
                            }}
                            className="w-28"
                          />
                        </Table.Cell>
                        <Table.Cell>
                          {pct == null ? (
                            "—"
                          ) : (
                            <Badge
                              size="2xsmall"
                              color={pct >= 30 ? "red" : pct >= 15 ? "orange" : "green"}
                            >
                              {pct}% off
                            </Badge>
                          )}
                        </Table.Cell>
                      </Table.Row>
                    )
                  })}
                </Table.Body>
              </Table>
              <Text size="small" className="text-ui-fg-muted">
                Each approval creates a customer-specific promotion locking the price delta until
                expiry.
              </Text>
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Buy-at-Price",
})

export default BuyAtPricePage
