import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Badge, Table, Button, Input } from "@medusajs/ui"
import { useEffect, useState } from "react"

type QualityIssue = {
  entity_id: string
  entity_type: string
  title: string
  rule: string
  severity: string
}

type Hop = {
  id: string
  name: string
  slug: string
  origin: string | null
  flavor_profile: string | null
  is_active: boolean
}

const CatalogPage = () => {
  const [issues, setIssues] = useState<QualityIssue[]>([])
  const [summary, setSummary] = useState<any>({})
  const [queue, setQueue] = useState<any[]>([])
  const [hops, setHops] = useState<Hop[]>([])
  const [tab, setTab] = useState<"quality" | "hops" | "taxonomy">("quality")
  const [newHop, setNewHop] = useState({ name: "", slug: "", origin: "", flavor_profile: "" })

  useEffect(() => {
    if (tab === "quality") {
      fetch("/admin/catalog/data-quality", { credentials: "include" })
        .then((r) => r.json())
        .then((data) => {
          setIssues(data.items || [])
          setSummary(data.summary || {})
        })
    } else if (tab === "hops") {
      fetch("/admin/catalog/hop-inference", { credentials: "include" })
        .then((r) => r.json())
        .then((data) => setQueue(data.queue || []))
    } else if (tab === "taxonomy") {
      fetch("/admin/hops", { credentials: "include" })
        .then((r) => r.json())
        .then((data) => setHops(data.hops || []))
    }
  }, [tab])

  const handleApprove = async (id: string) => {
    await fetch(`/admin/catalog/hop-inference/${id}/approve`, {
      method: "POST",
      credentials: "include",
    })
    setQueue((q) => q.filter((item) => item.id !== id))
  }

  const handleDismiss = async (id: string) => {
    await fetch(`/admin/catalog/hop-inference/${id}/dismiss`, {
      method: "POST",
      credentials: "include",
    })
    setQueue((q) => q.filter((item) => item.id !== id))
  }

  const handleAddHop = async () => {
    if (!newHop.name) return
    const slug = newHop.slug || newHop.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
    await fetch("/admin/hops", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newHop, slug }),
    })
    setNewHop({ name: "", slug: "", origin: "", flavor_profile: "" })
    fetch("/admin/hops", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setHops(data.hops || []))
  }

  const handleDeactivateHop = async (id: string) => {
    await fetch(`/admin/hops/${id}`, {
      method: "DELETE",
      credentials: "include",
    })
    setHops((h) => h.map((hop) => hop.id === id ? { ...hop, is_active: false } : hop))
  }

  return (
    <Container>
      <Heading level="h1" className="mb-4">Catalog Intelligence</Heading>
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("quality")}
          className={`px-3 py-1 text-sm rounded-full border ${tab === "quality" ? "bg-ui-bg-interactive text-ui-fg-on-color" : "border-ui-border-base"}`}
        >
          Data Quality
        </button>
        <button
          onClick={() => setTab("hops")}
          className={`px-3 py-1 text-sm rounded-full border ${tab === "hops" ? "bg-ui-bg-interactive text-ui-fg-on-color" : "border-ui-border-base"}`}
        >
          Hop Inference Queue
        </button>
        <button
          onClick={() => setTab("taxonomy")}
          className={`px-3 py-1 text-sm rounded-full border ${tab === "taxonomy" ? "bg-ui-bg-interactive text-ui-fg-on-color" : "border-ui-border-base"}`}
        >
          Hop Taxonomy ({hops.filter((h) => h.is_active).length})
        </button>
      </div>

      {tab === "quality" && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 border border-ui-border-base rounded-lg">
              <p className="text-2xl font-bold">{summary.total_issues || 0}</p>
              <p className="text-sm text-ui-fg-subtle">Total Issues</p>
            </div>
            <div className="p-4 border border-ui-border-base rounded-lg">
              <p className="text-2xl font-bold">{Object.keys(summary.by_rule || {}).length}</p>
              <p className="text-sm text-ui-fg-subtle">Rule Categories</p>
            </div>
          </div>
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Title</Table.HeaderCell>
                <Table.HeaderCell>Type</Table.HeaderCell>
                <Table.HeaderCell>Rule</Table.HeaderCell>
                <Table.HeaderCell>Severity</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {issues.slice(0, 50).map((issue, i) => (
                <Table.Row key={i}>
                  <Table.Cell>{issue.title}</Table.Cell>
                  <Table.Cell>{issue.entity_type}</Table.Cell>
                  <Table.Cell><Badge>{issue.rule}</Badge></Table.Cell>
                  <Table.Cell>
                    <Badge color={issue.severity === "error" ? "red" : "orange"}>
                      {issue.severity}
                    </Badge>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </>
      )}

      {tab === "hops" && (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Product</Table.HeaderCell>
              <Table.HeaderCell>Inferred Hops</Table.HeaderCell>
              <Table.HeaderCell>Source</Table.HeaderCell>
              <Table.HeaderCell>Actions</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {queue.map((item) => (
              <Table.Row key={item.id}>
                <Table.Cell>{item.product_id}</Table.Cell>
                <Table.Cell>{item.inferred_hops}</Table.Cell>
                <Table.Cell><Badge>{item.source}</Badge></Table.Cell>
                <Table.Cell>
                  <div className="flex gap-2">
                    <Button size="small" onClick={() => handleApprove(item.id)}>Approve</Button>
                    <Button size="small" variant="secondary" onClick={() => handleDismiss(item.id)}>Dismiss</Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
            {queue.length === 0 && (
              <Table.Row>
                <Table.Cell colSpan={4} className="text-center text-ui-fg-subtle py-8">
                  No pending inferences. The job runs every 6 hours.
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      )}

      {tab === "taxonomy" && (
        <>
          <div className="mb-6 p-4 border border-ui-border-base rounded-lg">
            <p className="text-sm font-medium mb-3">Add New Hop</p>
            <div className="grid grid-cols-4 gap-3">
              <Input
                placeholder="Name (e.g. Citra)"
                value={newHop.name}
                onChange={(e) => setNewHop({ ...newHop, name: e.target.value })}
              />
              <Input
                placeholder="Origin (e.g. USA - Yakima Valley)"
                value={newHop.origin}
                onChange={(e) => setNewHop({ ...newHop, origin: e.target.value })}
              />
              <Input
                placeholder="Flavor (e.g. Tropical, citrus)"
                value={newHop.flavor_profile}
                onChange={(e) => setNewHop({ ...newHop, flavor_profile: e.target.value })}
              />
              <Button onClick={handleAddHop} disabled={!newHop.name}>Add Hop</Button>
            </div>
          </div>
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Name</Table.HeaderCell>
                <Table.HeaderCell>Origin</Table.HeaderCell>
                <Table.HeaderCell>Flavor Profile</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Actions</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {hops.map((hop) => (
                <Table.Row key={hop.id}>
                  <Table.Cell className="font-medium">{hop.name}</Table.Cell>
                  <Table.Cell className="text-ui-fg-subtle">{hop.origin || "—"}</Table.Cell>
                  <Table.Cell className="text-ui-fg-subtle">{hop.flavor_profile || "—"}</Table.Cell>
                  <Table.Cell>
                    <Badge color={hop.is_active ? "green" : "grey"}>
                      {hop.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    {hop.is_active && (
                      <Button size="small" variant="secondary" onClick={() => handleDeactivateHop(hop.id)}>
                        Deactivate
                      </Button>
                    )}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Catalog Intelligence",
})

export default CatalogPage
