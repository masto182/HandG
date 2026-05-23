import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Table, Badge, Input, Button } from "@medusajs/ui"
import { useEffect, useState } from "react"

type Member = {
  id: string
  email: string
  first_name: string
  last_name: string
  current_tier: string
  vip_score: number
  referral_count: number
  created_at: string
}

const TABS = ["all", "pending", "approved", "vip1", "vip2", "vip3", "vip4", "vip5", "suspended"]
const PAGE_SIZE = 25

const MembersPage = () => {
  const [members, setMembers] = useState<Member[]>([])
  const [activeTab, setActiveTab] = useState("all")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)

  const load = (tab: string, q: string, off: number) => {
    setLoading(true)
    const params = new URLSearchParams({
      group: tab,
      limit: String(PAGE_SIZE),
      offset: String(off),
    })
    if (q.trim()) params.set("q", q.trim())
    fetch(`/admin/members?${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setMembers(data.members || [])
        setTotal(data.count || 0)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    setOffset(0)
    load(activeTab, search, 0)
  }, [activeTab])

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

  return (
    <Container>
      <Heading level="h1" className="mb-4">Members</Heading>

      <div className="flex items-center gap-2 mb-4">
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doSearch()}
          className="max-w-xs"
        />
        <Button variant="secondary" size="small" onClick={doSearch}>
          Search
        </Button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 text-sm rounded-full border ${
              activeTab === tab
                ? "bg-ui-bg-interactive text-ui-fg-on-color border-ui-border-interactive"
                : "border-ui-border-base hover:bg-ui-bg-subtle"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Name</Table.HeaderCell>
                <Table.HeaderCell>Email</Table.HeaderCell>
                <Table.HeaderCell>Tier</Table.HeaderCell>
                <Table.HeaderCell>VIP Score</Table.HeaderCell>
                <Table.HeaderCell>Referrals</Table.HeaderCell>
                <Table.HeaderCell>Actions</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {members.map((m) => (
                <Table.Row key={m.id}>
                  <Table.Cell>{m.first_name} {m.last_name}</Table.Cell>
                  <Table.Cell>{m.email}</Table.Cell>
                  <Table.Cell>
                    <Badge color={m.current_tier.startsWith("vip") ? "green" : "grey"}>
                      {m.current_tier}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>${m.vip_score.toFixed(0)}</Table.Cell>
                  <Table.Cell>{m.referral_count}</Table.Cell>
                  <Table.Cell>
                    {m.current_tier === "pending" && (
                      <button
                        onClick={() => {
                          fetch(`/admin/members/${m.id}/approve`, {
                            method: "POST",
                            credentials: "include",
                          }).then(() => load(activeTab, search, offset))
                        }}
                        className="text-xs text-ui-fg-interactive hover:underline"
                      >
                        Approve
                      </button>
                    )}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>

          <div className="flex items-center justify-between mt-4 text-sm text-ui-fg-subtle">
            <span>
              Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="small"
                onClick={prevPage}
                disabled={offset === 0}
              >
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
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Members",
  icon: undefined,
})

export default MembersPage
