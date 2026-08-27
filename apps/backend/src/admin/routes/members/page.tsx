import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Table,
  Badge,
  Input,
  Button,
  Checkbox,
  Drawer,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { sdk } from "../../lib/sdk"

type ReferredBy = { id: string; name: string; tier: string }

type Member = {
  id: string
  email: string
  first_name: string
  last_name: string
  groups: string[]
  metadata: Record<string, any> | null
  current_tier: string
  vip_score: number
  referral_count: number
  referred_by: ReferredBy | null
  created_at: string
  last_active: string | null
}

type Counts = {
  all: number
  pending: number
  approved: number
  vip: number
  suspended: number
}

type OrderLite = {
  id: string
  display_id: number
  total: number
  currency_code: string
  created_at: string
}

type MemberActivityData = {
  summary: {
    sessions: number
    completed_orders: number
    last_fulfilment_method: "pickup" | "delivery" | null
    highest_stage: string | null
  }
  sessions: Array<{
    session_id: string
    started_at: string | null
    last_at: string | null
    fulfilment_method: "pickup" | "delivery" | null
    max_stage: string
    outcome: "completed" | "placed" | "dropped"
    order_ids: string[]
  }>
  products: Array<{
    product_id: string
    handle: string
    views: number
    cart_adds: number
  }>
  filters: Array<{
    filter: string
    uses: number
    values: string[]
  }>
  pages: Array<{
    path: string
    referrer: string | null
    at: string | null
  }>
  last_active: string | null
}

const TABS: { key: string; label: string; countKey: keyof Counts }[] = [
  { key: "pending", label: "Pending", countKey: "pending" },
  { key: "approved", label: "Approved", countKey: "approved" },
  { key: "vip", label: "VIP", countKey: "vip" },
  { key: "suspended", label: "Suspended", countKey: "suspended" },
  { key: "all", label: "All", countKey: "all" },
]
const PAGE_SIZE = 25

// VIP thresholds (OR logic): reaches tier at orders OR spend, whichever first
const VIP_THRESHOLDS: Record<string, { orders: number; spend: number; next?: string }> = {
  approved: { orders: 3, spend: 150, next: "VIP1" },
  vip1: { orders: 8, spend: 400, next: "VIP2" },
  vip2: { orders: 15, spend: 800, next: "VIP3" },
  vip3: { orders: 25, spend: 1500, next: "VIP4" },
  vip4: { orders: 40, spend: 3000, next: "VIP5" },
}

const fmtAud = (n: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n || 0)

const fmtDate = (s?: string) =>
  s
    ? new Date(s).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—"

const daysAgo = (s?: string): number | null => {
  if (!s) return null
  const d = new Date(s)
  if (isNaN(d.getTime())) return null
  return Math.floor((Date.now() - d.getTime()) / 86_400_000)
}

const fmtRelative = (s?: string | null): string => {
  if (!s) return "Never"
  const d = new Date(s)
  if (isNaN(d.getTime())) return "Never"
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000)
  if (seconds < 300) return "Online now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

const ageFromDob = (dob?: string): number | null => {
  if (!dob) return null
  const d = new Date(dob)
  if (isNaN(d.getTime())) return null
  const now = new Date()
  let a = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--
  return a
}

const memberStatus = (m: Member): string => {
  const g = m.groups || []
  if (g.includes("suspended")) return "suspended"
  const vip = g.find((x) => /^vip\d/.test(x))
  if (vip) return vip
  if (g.includes("approved")) return "approved"
  return "pending"
}

const tierColor = (tier: string): "grey" | "green" | "purple" | "red" => {
  if (tier?.startsWith("vip")) return "purple"
  if (tier === "approved") return "green"
  if (tier === "suspended") return "red"
  return "grey"
}

const ReferredByCell = ({ referrer }: { referrer: ReferredBy | null }) => {
  if (!referrer) {
    return (
      <Text size="small" className="text-ui-fg-muted">
        Direct — no code
      </Text>
    )
  }
  return (
    <div className="flex items-center gap-2">
      <Text size="small">{referrer.name}</Text>
      <Badge size="2xsmall" color={tierColor(referrer.tier)}>
        {referrer.tier}
      </Badge>
    </div>
  )
}

const MembersPage = () => {
  const [members, setMembers] = useState<Member[]>([])
  const [counts, setCounts] = useState<Counts | null>(null)
  const [activeTab, setActiveTab] = useState("pending")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [drawer, setDrawer] = useState<Member | null>(null)
  const [orders, setOrders] = useState<{ count: number; latest?: OrderLite } | null>(null)
  const [activity, setActivity] = useState<MemberActivityData | null>(null)
  const [actioning, setActioning] = useState(false)
  const prompt = usePrompt()
  const [searchParams, setSearchParams] = useSearchParams()

  const isPending = activeTab === "pending"

  const load = (tab: string, q: string, off: number) => {
    setLoading(true)
    const params = new URLSearchParams({
      group: tab,
      limit: String(PAGE_SIZE),
      offset: String(off),
    })
    if (q.trim()) params.set("q", q.trim())
    sdk.client
      .fetch<{ members: Member[]; count: number; counts: Counts }>(
        `/admin/members?${params.toString()}`
      )
      .then((data) => {
        setMembers(data.members || [])
        setTotal(data.count || 0)
        setCounts(data.counts || null)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
        toast.error("Failed to load members")
      })
  }

  useEffect(() => {
    setOffset(0)
    setSelected(new Set())
    setSearch("")
    load(activeTab, "", 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Deep-link support: ?id=<customer_id> opens that member's drawer directly,
  // regardless of which tab/group they belong to (e.g. from an Insights
  // drill-down link). Clears the query param once handled.
  useEffect(() => {
    const targetId = searchParams.get("id")
    if (!targetId) return
    sdk.client
      .fetch<{ members: Member[] }>(`/admin/members?id=${encodeURIComponent(targetId)}`)
      .then((data) => {
        const match = data.members?.[0]
        if (match) {
          setDrawer(match)
        } else {
          toast.error("Member not found")
        }
      })
      .catch(() => toast.error("Failed to load member"))
      .finally(() => {
        const next = new URLSearchParams(searchParams)
        next.delete("id")
        setSearchParams(next, { replace: true })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Order history for the drawer (non-pending only)
  useEffect(() => {
    if (!drawer || memberStatus(drawer) === "pending") {
      setOrders(null)
      setActivity(null)
      return
    }
    Promise.all([
      sdk.admin.order.list({
        customer_id: drawer.id,
        limit: 5,
        fields: "id,display_id,total,currency_code,created_at",
        order: "-created_at",
      } as any),
      sdk.client.fetch<{ activity: MemberActivityData }>(`/admin/members/${drawer.id}/activity`),
    ])
      .then(([ordersResponse, activityResponse]: any) => {
        setOrders({ count: ordersResponse.count || 0, latest: ordersResponse.orders?.[0] })
        setActivity(activityResponse.activity)
      })
      .catch(() => {
        setOrders(null)
        setActivity(null)
      })
  }, [drawer])

  const reload = () => load(activeTab, search, offset)

  const doSearch = () => {
    setOffset(0)
    load(activeTab, search, 0)
  }

  const prevPage = () => {
    const next = Math.max(0, offset - PAGE_SIZE)
    setOffset(next)
    load(activeTab, search, next)
  }
  const nextPage = () => {
    const next = offset + PAGE_SIZE
    setOffset(next)
    load(activeTab, search, next)
  }

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }
  const allOnPageSelected = members.length > 0 && members.every((m) => selected.has(m.id))
  const toggleAll = () => {
    setSelected((prev) => {
      if (members.every((m) => prev.has(m.id))) {
        const n = new Set(prev)
        members.forEach((m) => n.delete(m.id))
        return n
      }
      const n = new Set(prev)
      members.forEach((m) => n.add(m.id))
      return n
    })
  }

  const runAction = (id: string, action: string) =>
    sdk.client.fetch(`/admin/members/${id}/${action}`, { method: "POST" })

  const approve = async (id: string) => {
    const ok = await prompt({
      title: "Approve member?",
      description: "This grants store access and generates a referral code for this member.",
      confirmText: "Approve",
      cancelText: "Cancel",
      variant: "confirmation",
    })
    if (!ok) return
    setActioning(true)
    try {
      await runAction(id, "approve")
      toast.success("Member approved")
      setDrawer(null)
      reload()
    } catch {
      toast.error("Approve failed")
    } finally {
      setActioning(false)
    }
  }

  const confirmAndRun = async (
    id: string,
    action: "reject" | "suspend" | "reactivate",
    copy: { title: string; description: string; confirmText: string }
  ) => {
    const ok = await prompt({
      title: copy.title,
      description: copy.description,
      confirmText: copy.confirmText,
      cancelText: "Cancel",
      variant: action === "reactivate" ? "confirmation" : "danger",
    })
    if (!ok) return
    setActioning(true)
    try {
      await runAction(id, action)
      toast.success(copy.title.replace(/\?$/, "") + " done")
      setDrawer(null)
      reload()
    } catch {
      toast.error("Action failed")
    } finally {
      setActioning(false)
    }
  }

  const bulkApprove = async () => {
    const ids = [...selected]
    if (!ids.length) return
    setActioning(true)
    try {
      for (const id of ids) await runAction(id, "approve")
      toast.success(`Approved ${ids.length} member${ids.length > 1 ? "s" : ""}`)
      setSelected(new Set())
      reload()
    } catch {
      toast.error("Bulk approve failed")
    } finally {
      setActioning(false)
    }
  }

  const bulkReject = async () => {
    const ids = [...selected]
    if (!ids.length) return
    const ok = await prompt({
      title: `Reject ${ids.length} applicant${ids.length > 1 ? "s" : ""}?`,
      description:
        "This moves them to the suspended group. They will not be able to access the store.",
      confirmText: "Reject",
      cancelText: "Cancel",
      variant: "danger",
    })
    if (!ok) return
    setActioning(true)
    try {
      for (const id of ids) await runAction(id, "reject")
      toast.success(`Rejected ${ids.length} applicant${ids.length > 1 ? "s" : ""}`)
      setSelected(new Set())
      reload()
    } catch {
      toast.error("Bulk reject failed")
    } finally {
      setActioning(false)
    }
  }

  return (
    <Container className="p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h1">Members</Heading>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch()}
            className="w-64"
            size="small"
          />
          <Button variant="secondary" size="small" onClick={doSearch}>
            Search
          </Button>
        </div>
      </div>

      {/* Tabs with counts */}
      <div className="flex items-center gap-2 px-6 pb-3 flex-wrap border-b border-ui-border-base">
        {TABS.map((t) => {
          const c = counts ? counts[t.countKey] : undefined
          const active = activeTab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                active
                  ? "bg-ui-bg-base border-ui-border-interactive text-ui-fg-base font-medium shadow-sm"
                  : "border-transparent text-ui-fg-subtle hover:bg-ui-bg-subtle"
              }`}
            >
              {t.label}
              {c !== undefined && <span className="ml-1.5 text-ui-fg-muted">{c}</span>}
            </button>
          )
        })}
      </div>

      {isPending && (
        <Text size="small" className="text-ui-fg-muted px-6 pt-2">
          Tier &amp; VIP score appear on the Approved / VIP tabs.
        </Text>
      )}

      {/* Bulk action bar (pending only) */}
      {isPending && selected.size > 0 && (
        <div className="flex items-center justify-between px-6 py-2 mt-2 bg-ui-bg-subtle border-y border-ui-border-base">
          <Text size="small" weight="plus">
            {selected.size} selected
          </Text>
          <div className="flex items-center gap-2">
            <Button size="small" variant="primary" isLoading={actioning} onClick={bulkApprove}>
              Approve {selected.size}
            </Button>
            <Button size="small" variant="danger" disabled={actioning} onClick={bulkReject}>
              Reject {selected.size}
            </Button>
          </div>
        </div>
      )}

      <div className="px-6 py-4">
        {loading ? (
          <Text className="text-ui-fg-subtle">Loading…</Text>
        ) : members.length === 0 ? (
          <div className="text-center py-12 text-ui-fg-subtle">
            <Text>No members in this view.</Text>
          </div>
        ) : (
          <>
            <Table>
              <Table.Header>
                <Table.Row>
                  {isPending && (
                    <Table.HeaderCell className="w-10">
                      <Checkbox checked={allOnPageSelected} onCheckedChange={toggleAll} />
                    </Table.HeaderCell>
                  )}
                  <Table.HeaderCell>Name</Table.HeaderCell>
                  <Table.HeaderCell>Email</Table.HeaderCell>
                  {isPending ? (
                    <>
                      <Table.HeaderCell>Waiting</Table.HeaderCell>
                      <Table.HeaderCell>Why join</Table.HeaderCell>
                    </>
                  ) : (
                    <>
                      <Table.HeaderCell>Tier</Table.HeaderCell>
                      <Table.HeaderCell>VIP score (AUD)</Table.HeaderCell>
                    </>
                  )}
                  <Table.HeaderCell>Referred by</Table.HeaderCell>
                  {!isPending && <Table.HeaderCell>Joined</Table.HeaderCell>}
                  {!isPending && <Table.HeaderCell>Last active</Table.HeaderCell>}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {members.map((m) => {
                  const wait = daysAgo(m.created_at)
                  const stale = isPending && wait !== null && wait > 7
                  const why = (m.metadata?.why_join as string) || ""
                  const status = memberStatus(m)
                  return (
                    <Table.Row key={m.id} className="cursor-pointer" onClick={() => setDrawer(m)}>
                      {isPending && (
                        <Table.Cell
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleRow(m.id)
                          }}
                        >
                          <Checkbox checked={selected.has(m.id)} />
                        </Table.Cell>
                      )}
                      <Table.Cell>
                        {m.first_name} {m.last_name}
                      </Table.Cell>
                      <Table.Cell className="text-ui-fg-subtle">{m.email}</Table.Cell>
                      {isPending ? (
                        <>
                          <Table.Cell>
                            <div className="flex items-center gap-1.5">
                              {stale && (
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-ui-tag-orange-icon" />
                              )}
                              <span className={stale ? "text-ui-tag-orange-text" : ""}>
                                {wait === null ? "—" : `${wait}d`}
                              </span>
                            </div>
                          </Table.Cell>
                          <Table.Cell className="max-w-xs">
                            <span className="block truncate text-ui-fg-subtle">{why || "—"}</span>
                          </Table.Cell>
                        </>
                      ) : (
                        <>
                          <Table.Cell>
                            <Badge size="2xsmall" color={tierColor(status)}>
                              {status}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>{fmtAud(m.vip_score)}</Table.Cell>
                        </>
                      )}
                      <Table.Cell>
                        <ReferredByCell referrer={m.referred_by} />
                      </Table.Cell>
                      {!isPending && (
                        <Table.Cell className="text-ui-fg-subtle">
                          {fmtDate(m.created_at)}
                        </Table.Cell>
                      )}
                      {!isPending && (
                        <Table.Cell className="text-ui-fg-subtle">
                          {fmtRelative(m.last_active)}
                        </Table.Cell>
                      )}
                    </Table.Row>
                  )
                })}
              </Table.Body>
            </Table>

            <div className="flex items-center justify-between mt-4 text-sm text-ui-fg-subtle">
              <span>
                Showing {total === 0 ? 0 : offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of{" "}
                {total}
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" size="small" onClick={prevPage} disabled={offset === 0}>
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={nextPage}
                  disabled={offset + PAGE_SIZE >= total}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <MemberDrawer
        member={drawer}
        orders={orders}
        activity={activity}
        actioning={actioning}
        onClose={() => setDrawer(null)}
        onApprove={approve}
        onReject={(id) =>
          confirmAndRun(id, "reject", {
            title: "Reject application?",
            description:
              "This moves the applicant to the suspended group. They will not be able to access the store.",
            confirmText: "Reject",
          })
        }
        onSuspend={(id) =>
          confirmAndRun(id, "suspend", {
            title: "Suspend member?",
            description: "This revokes their store access. You can reactivate them later.",
            confirmText: "Suspend",
          })
        }
        onReactivate={(id) =>
          confirmAndRun(id, "reactivate", {
            title: "Reactivate member?",
            description: "",
            confirmText: "Reactivate",
          })
        }
      />
    </Container>
  )
}

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4 py-1.5">
    <Text size="small" className="text-ui-fg-muted shrink-0">
      {label}
    </Text>
    <div className="text-right text-ui-fg-base text-sm">{children}</div>
  </div>
)

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="py-4 border-t border-ui-border-base first:border-t-0">
    <Text size="small" weight="plus" className="mb-2 block">
      {title}
    </Text>
    {children}
  </div>
)

const MemberDrawer = ({
  member,
  orders,
  activity,
  actioning,
  onClose,
  onApprove,
  onReject,
  onSuspend,
  onReactivate,
}: {
  member: Member | null
  orders: { count: number; latest?: OrderLite } | null
  activity: MemberActivityData | null
  actioning: boolean
  onClose: () => void
  onApprove: (id: string) => void
  onReject: (id: string) => void
  onSuspend: (id: string) => void
  onReactivate: (id: string) => void
}) => {
  const open = !!member
  const status = member ? memberStatus(member) : "pending"
  const isPending = status === "pending"
  const isSuspended = status === "suspended"
  const md = member?.metadata || {}
  const age = ageFromDob(md.date_of_birth)
  const threshold = VIP_THRESHOLDS[status]

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Content>
        {member && (
          <>
            <Drawer.Header>
              <div className="flex items-center justify-between w-full pr-2">
                <div>
                  <Drawer.Title>
                    {member.first_name} {member.last_name}
                  </Drawer.Title>
                  <Text size="small" className="text-ui-fg-subtle">
                    {member.email}
                  </Text>
                </div>
                <Badge color={tierColor(status)}>{status}</Badge>
              </div>
            </Drawer.Header>
            <Drawer.Body className="overflow-y-auto">
              <Section title="Application">
                <Row label="18+ verified">
                  {age !== null ? (
                    <Badge size="2xsmall" color={age >= 18 ? "green" : "red"}>
                      {age >= 18 ? "18+" : "Under 18"} · DOB {fmtDate(md.date_of_birth)}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </Row>
                <Row label="Why join">
                  <span className="text-ui-fg-subtle">{md.why_join || "—"}</span>
                </Row>
                <Row label="Favourite brewery">{md.favourite_brewery || "—"}</Row>
                <Row label="Untappd">
                  {md.untappd_id ? (
                    <a
                      className="text-ui-fg-interactive hover:underline"
                      href={`https://untappd.com/user/${md.untappd_id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      @{md.untappd_id}
                    </a>
                  ) : (
                    "—"
                  )}
                </Row>
                <Row label="Signed up">{fmtDate(member.created_at)}</Row>
                <Row label="Last active">
                  <Badge
                    size="2xsmall"
                    color={fmtRelative(member.last_active) === "Online now" ? "green" : "grey"}
                  >
                    {fmtRelative(member.last_active)}
                  </Badge>
                </Row>
              </Section>

              <Section title="Referral">
                <Row label="Referred by">
                  <ReferredByCell referrer={member.referred_by} />
                </Row>
                <Row label="Members referred">{member.referral_count}</Row>
              </Section>

              {isPending ? (
                <div className="py-4 border-t border-ui-border-base">
                  <Text size="small" className="text-ui-fg-muted">
                    VIP progress &amp; order history appear once the member is approved.
                  </Text>
                </div>
              ) : (
                <>
                  <Section title="VIP &amp; orders">
                    <Row label="Tier">
                      <Badge size="2xsmall" color={tierColor(status)}>
                        {member.current_tier}
                      </Badge>
                    </Row>
                    <Row label="VIP score">{fmtAud(member.vip_score)}</Row>
                    {threshold && (
                      <Text size="small" className="text-ui-fg-muted block pt-1">
                        Reaches {threshold.next} at {threshold.orders} orders or{" "}
                        {fmtAud(threshold.spend)} — whichever comes first.
                      </Text>
                    )}
                    <Row label="Orders">{orders ? `${orders.count} orders` : "…"}</Row>
                    {orders?.latest && (
                      <Row label="Last order">
                        #{orders.latest.display_id} · {fmtDate(orders.latest.created_at)}
                      </Row>
                    )}
                  </Section>

                  <Section title="Activity">
                    <Row label="Checkout sessions">
                      {activity ? activity.summary.sessions : "…"}
                    </Row>
                    <Row label="Completed orders">
                      {activity ? activity.summary.completed_orders : "…"}
                    </Row>
                    <Row label="Last fulfilment">
                      {activity?.summary.last_fulfilment_method ?? "—"}
                    </Row>
                    <Row label="Highest stage">{activity?.summary.highest_stage ?? "—"}</Row>
                    <div className="pt-2 space-y-2">
                      {(activity?.sessions ?? []).slice(0, 3).map((session) => (
                        <div
                          key={session.session_id}
                          className="rounded-md border border-ui-border-base p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <Text size="small" weight="plus">
                              {session.fulfilment_method ?? "unknown"} · {session.max_stage}
                            </Text>
                            <Badge
                              size="2xsmall"
                              color={
                                session.outcome === "completed"
                                  ? "green"
                                  : session.outcome === "placed"
                                    ? "orange"
                                    : "grey"
                              }
                            >
                              {session.outcome}
                            </Badge>
                          </div>
                          <Text size="small" className="text-ui-fg-muted mt-1">
                            {fmtDate(session.last_at ?? undefined)}
                          </Text>
                        </div>
                      ))}
                    </div>
                    {(activity?.products.length ?? 0) > 0 && (
                      <div className="pt-3">
                        <Text size="small" weight="plus" className="mb-2 block">
                          Products
                        </Text>
                        <div className="space-y-1">
                          {activity!.products.slice(0, 5).map((product) => (
                            <div
                              key={product.product_id}
                              className="flex items-center justify-between gap-2"
                            >
                              <Text size="small">
                                {product.handle || product.product_id.slice(-8)}
                              </Text>
                              <Text size="small" className="text-ui-fg-muted">
                                {product.views} views · {product.cart_adds} carts
                              </Text>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {(activity?.pages.length ?? 0) > 0 && (
                      <div className="pt-3">
                        <Text size="small" weight="plus" className="mb-2 block">
                          Pages viewed
                        </Text>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {activity!.pages.slice(0, 20).map((page, idx) => (
                            <div
                              key={`${page.path}-${page.at}-${idx}`}
                              className="flex items-center justify-between gap-2"
                            >
                              <Text size="small" className="truncate">
                                {page.path}
                              </Text>
                              <Text size="small" className="text-ui-fg-muted whitespace-nowrap">
                                {fmtRelative(page.at)}
                              </Text>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Section>
                </>
              )}
            </Drawer.Body>
            <Drawer.Footer>
              {isPending && (
                <>
                  <Button variant="danger" disabled={actioning} onClick={() => onReject(member.id)}>
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    isLoading={actioning}
                    onClick={() => onApprove(member.id)}
                  >
                    Approve
                  </Button>
                </>
              )}
              {(status === "approved" || status.startsWith("vip")) && (
                <Button variant="danger" disabled={actioning} onClick={() => onSuspend(member.id)}>
                  Suspend
                </Button>
              )}
              {isSuspended && (
                <Button
                  variant="primary"
                  isLoading={actioning}
                  onClick={() => onReactivate(member.id)}
                >
                  Reactivate
                </Button>
              )}
            </Drawer.Footer>
          </>
        )}
      </Drawer.Content>
    </Drawer>
  )
}

export const config = defineRouteConfig({
  label: "Members",
})

export default MembersPage
