import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Badge, Table, Select, Text } from "@medusajs/ui"
import { useEffect, useState } from "react"

type EmailLogRow = {
  id: string
  to_address: string
  subject: string | null
  category: string
  template_name: string
  status: string
  sent_at: string | null
  open_count: number
  click_count: number
}

const STATUS_COLORS: Record<string, "green" | "red" | "orange" | "blue" | "grey"> = {
  sent: "blue",
  delivered: "green",
  delayed: "orange",
  bounced: "red",
  complained: "red",
  opened: "green",
  clicked: "green",
  failed: "red",
}

const STATUSES = [
  "sent",
  "delivered",
  "delayed",
  "bounced",
  "complained",
  "opened",
  "clicked",
  "failed",
]

const EmailLogPage = () => {
  const [logs, setLogs] = useState<EmailLogRow[]>([])
  const [count, setCount] = useState(0)
  const [status, setStatus] = useState<string>("")
  const [category, setCategory] = useState<string>("")
  const [offset, setOffset] = useState(0)
  const limit = 50

  useEffect(() => {
    const params = new URLSearchParams()
    if (status) params.set("status", status)
    if (category) params.set("category", category)
    params.set("limit", String(limit))
    params.set("offset", String(offset))

    fetch(`/admin/email-logs?${params.toString()}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setLogs(data.logs || [])
        setCount(data.count || 0)
      })
  }, [status, category, offset])

  return (
    <Container>
      <div className="flex items-center justify-between mb-4">
        <Heading level="h1">Email Log</Heading>
        <Text className="text-ui-fg-subtle">{count} sends</Text>
      </div>

      <div className="flex gap-3 mb-4">
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v)
            setOffset(0)
          }}
        >
          <Select.Trigger className="w-48">
            <Select.Value placeholder="All statuses" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="">All statuses</Select.Item>
            {STATUSES.map((s) => (
              <Select.Item key={s} value={s}>
                {s}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
        <Select
          value={category}
          onValueChange={(v) => {
            setCategory(v)
            setOffset(0)
          }}
        >
          <Select.Trigger className="w-48">
            <Select.Value placeholder="All categories" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="">All categories</Select.Item>
            {[
              "orders",
              "account",
              "applications",
              "restock_alerts",
              "vip_progression",
              "referrals",
              "wishlist_offers",
              "brewery_releases",
              "new_drops",
              "hop_alerts",
              "announcements",
            ].map((c) => (
              <Select.Item key={c} value={c}>
                {c}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>To</Table.HeaderCell>
            <Table.HeaderCell>Subject</Table.HeaderCell>
            <Table.HeaderCell>Category</Table.HeaderCell>
            <Table.HeaderCell>Template</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Sent</Table.HeaderCell>
            <Table.HeaderCell>Opens</Table.HeaderCell>
            <Table.HeaderCell>Clicks</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {logs.map((log) => (
            <Table.Row key={log.id}>
              <Table.Cell>{log.to_address}</Table.Cell>
              <Table.Cell className="text-ui-fg-subtle">{log.subject || "—"}</Table.Cell>
              <Table.Cell>
                <Badge>{log.category}</Badge>
              </Table.Cell>
              <Table.Cell className="text-ui-fg-subtle">{log.template_name}</Table.Cell>
              <Table.Cell>
                <Badge color={STATUS_COLORS[log.status] || "grey"}>{log.status}</Badge>
              </Table.Cell>
              <Table.Cell className="text-ui-fg-subtle">
                {log.sent_at ? new Date(log.sent_at).toLocaleString() : "—"}
              </Table.Cell>
              <Table.Cell>{log.open_count}</Table.Cell>
              <Table.Cell>{log.click_count}</Table.Cell>
            </Table.Row>
          ))}
          {logs.length === 0 && (
            <Table.Row>
              <Table.Cell colSpan={8} className="text-center text-ui-fg-subtle py-8">
                No emails logged yet.
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table>

      <div className="flex justify-end gap-2 mt-4">
        <button
          className="px-3 py-1 text-sm rounded-full border border-ui-border-base disabled:opacity-40"
          onClick={() => setOffset(Math.max(0, offset - limit))}
          disabled={offset === 0}
        >
          Previous
        </button>
        <button
          className="px-3 py-1 text-sm rounded-full border border-ui-border-base disabled:opacity-40"
          onClick={() => setOffset(offset + limit)}
          disabled={offset + limit >= count}
        >
          Next
        </button>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Email Log",
})

export default EmailLogPage
