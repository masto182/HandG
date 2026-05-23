import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect, useState } from "react"
import { sdk } from "../lib/sdk"

type Hop = {
  id: string
  name: string
  slug: string
  origin: string | null
  flavor_profile: string | null
  is_active: boolean
}

const ProductHopsWidget = ({ data }: { data: any }) => {
  const product = data
  const [linkedHops, setLinkedHops] = useState<Hop[]>([])
  const [allHops, setAllHops] = useState<Hop[]>([])
  const [loading, setLoading] = useState(true)
  const [showPicker, setShowPicker] = useState(false)
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState(false)
  const [pendingAdd, setPendingAdd] = useState<Set<string>>(new Set())
  const [pendingRemove, setPendingRemove] = useState<Set<string>>(new Set())

  const fetchLinkedHops = async () => {
    try {
      const data = await sdk.client.fetch<{ hops: Hop[] }>(`/admin/products/${product.id}/hops`, { method: "GET" })
      setLinkedHops(data.hops || [])
    } catch {}
    setLoading(false)
  }

  const fetchAllHops = async () => {
    try {
      const data = await sdk.client.fetch<{ hops: Hop[] }>("/admin/hops", { method: "GET" })
      setAllHops(data.hops || [])
    } catch {}
  }

  useEffect(() => {
    fetchLinkedHops()
    fetchAllHops()
  }, [product.id])

  const toggleHop = (hop: Hop) => {
    const isCurrentlyLinked = linkedHops.some((h) => h.id === hop.id)
    const isInPendingAdd = pendingAdd.has(hop.id)
    const isInPendingRemove = pendingRemove.has(hop.id)

    if (isCurrentlyLinked) {
      if (isInPendingRemove) {
        setPendingRemove((prev) => { const next = new Set(prev); next.delete(hop.id); return next })
      } else {
        setPendingRemove((prev) => new Set(prev).add(hop.id))
      }
    } else {
      if (isInPendingAdd) {
        setPendingAdd((prev) => { const next = new Set(prev); next.delete(hop.id); return next })
      } else {
        setPendingAdd((prev) => new Set(prev).add(hop.id))
      }
    }
  }

  const isSelected = (hopId: string) => {
    const isLinked = linkedHops.some((h) => h.id === hopId)
    if (isLinked && pendingRemove.has(hopId)) return false
    if (!isLinked && pendingAdd.has(hopId)) return true
    return isLinked
  }

  const hasPendingChanges = pendingAdd.size > 0 || pendingRemove.size > 0

  const saveChanges = async () => {
    setSaving(true)
    try {
      if (pendingAdd.size > 0) {
        await sdk.client.fetch(`/admin/products/${product.id}/hops`, {
          method: "POST",
          body: { hop_ids: Array.from(pendingAdd) },
        })
      }
      if (pendingRemove.size > 0) {
        await sdk.client.fetch(`/admin/products/${product.id}/hops`, {
          method: "DELETE",
          body: { hop_ids: Array.from(pendingRemove) },
        })
      }
      setPendingAdd(new Set())
      setPendingRemove(new Set())
      await fetchLinkedHops()
    } catch {}
    setSaving(false)
  }

  const discardChanges = () => {
    setPendingAdd(new Set())
    setPendingRemove(new Set())
  }

  const selectedHops = allHops.filter((h) => isSelected(h.id))
  const availableForPicker = allHops
    .filter((h) => h.is_active)
    .filter((h) => !search || h.name.toLowerCase().includes(search.toLowerCase()))

  if (loading) {
    return (
      <div className="bg-ui-bg-base shadow-elevation-card-rest rounded-lg p-6">
        <p className="text-ui-fg-subtle text-sm">Loading hops...</p>
      </div>
    )
  }

  return (
    <div className="bg-ui-bg-base shadow-elevation-card-rest rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-ui-fg-base font-semibold text-sm">
          Hops
          {selectedHops.length > 0 && (
            <span className="ml-2 text-ui-fg-subtle font-normal">({selectedHops.length})</span>
          )}
        </h3>
        <div className="flex gap-2">
          {hasPendingChanges && (
            <>
              <button
                onClick={discardChanges}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-ui-border-base hover:bg-ui-bg-base-hover transition-colors text-ui-fg-subtle"
              >
                Discard
              </button>
              <button
                onClick={saveChanges}
                disabled={saving}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-ui-button-inverted text-ui-fg-on-inverted hover:bg-ui-button-inverted-hover transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : `Save (${pendingAdd.size + pendingRemove.size} changes)`}
              </button>
            </>
          )}
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-ui-border-base hover:bg-ui-bg-base-hover transition-colors"
          >
            {showPicker ? "Close" : "+ Edit Hops"}
          </button>
        </div>
      </div>

      {selectedHops.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedHops.map((hop) => {
            const isPendingNew = pendingAdd.has(hop.id)
            const isBeingRemoved = pendingRemove.has(hop.id)
            return (
              <span
                key={hop.id}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all ${
                  isPendingNew
                    ? "bg-ui-tag-green-bg border-ui-tag-green-border text-ui-tag-green-text"
                    : isBeingRemoved
                    ? "bg-ui-tag-red-bg border-ui-tag-red-border text-ui-tag-red-text line-through opacity-60"
                    : "bg-ui-bg-base-hover border-ui-border-base text-ui-fg-base"
                }`}
              >
                {hop.name}
                {isPendingNew && <span className="text-[10px]">new</span>}
              </span>
            )
          })}
        </div>
      ) : (
        <p className="text-ui-fg-subtle text-sm mb-2">
          No hops assigned. Click "+ Edit Hops" to select hop varieties.
        </p>
      )}

      {showPicker && (
        <div className="border border-ui-border-base rounded-lg p-3 mt-3">
          <input
            type="text"
            placeholder="Search hops..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-ui-border-base rounded-md mb-3 bg-ui-bg-field text-ui-fg-base placeholder:text-ui-fg-muted focus:outline-none focus:ring-2 focus:ring-ui-border-interactive"
          />
          <div className="max-h-64 overflow-y-auto space-y-0.5">
            {availableForPicker.length === 0 ? (
              <p className="text-ui-fg-subtle text-sm py-2 text-center">No hops found</p>
            ) : (
              availableForPicker.map((hop) => {
                const selected = isSelected(hop.id)
                return (
                  <button
                    key={hop.id}
                    onClick={() => toggleHop(hop)}
                    className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-3 text-sm transition-colors ${
                      selected ? "bg-ui-bg-interactive text-ui-fg-on-color" : "hover:bg-ui-bg-base-hover"
                    }`}
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      selected ? "bg-ui-fg-interactive border-ui-fg-interactive" : "border-ui-border-base"
                    }`}>
                      {selected && <span className="text-white text-[10px] font-bold">✓</span>}
                    </span>
                    <div className="flex-1">
                      <span className={selected ? "font-medium" : "text-ui-fg-base font-medium"}>{hop.name}</span>
                      {hop.origin && (
                        <span className={`ml-2 text-xs ${selected ? "opacity-80" : "text-ui-fg-subtle"}`}>{hop.origin}</span>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductHopsWidget
