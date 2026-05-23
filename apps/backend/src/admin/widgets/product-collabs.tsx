import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect, useState } from "react"
import { sdk } from "../lib/sdk"

type Brewery = {
  id: string
  name: string
  slug: string
  location: string | null
  is_active: boolean
}

const ProductCollabsWidget = ({ data }: { data: any }) => {
  const product = data
  const [allBreweries, setAllBreweries] = useState<Brewery[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showPicker, setShowPicker] = useState(false)
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    const meta = product.metadata as any
    setSelected(meta?.collab_partners || [])
    sdk.client
      .fetch<{ breweries: Brewery[] }>("/admin/breweries", { method: "GET" })
      .then((d) => setAllBreweries(d.breweries || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [product.id])

  const toggle = (slug: string) => {
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    )
    setDirty(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      const isCollab = selected.length > 0
      await sdk.client.fetch(`/admin/products/${product.id}`, {
        method: "POST",
        body: {
          metadata: {
            ...(product.metadata || {}),
            is_collab: isCollab,
            collab_partners: selected,
          },
        },
      })
      setDirty(false)
    } catch {}
    setSaving(false)
  }

  const discard = () => {
    const meta = product.metadata as any
    setSelected(meta?.collab_partners || [])
    setDirty(false)
  }

  const selectedBreweries = allBreweries.filter((b) => selected.includes(b.slug))
  const available = allBreweries
    .filter((b) => b.is_active)
    .filter((b) => !search || b.name.toLowerCase().includes(search.toLowerCase()))

  if (loading) {
    return (
      <div className="bg-ui-bg-base shadow-elevation-card-rest rounded-lg p-6">
        <p className="text-ui-fg-subtle text-sm">Loading breweries...</p>
      </div>
    )
  }

  return (
    <div className="bg-ui-bg-base shadow-elevation-card-rest rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-ui-fg-base font-semibold text-sm">
          Collab Partners
          {selectedBreweries.length > 0 && (
            <span className="ml-2 text-ui-fg-subtle font-normal">({selectedBreweries.length})</span>
          )}
        </h3>
        <div className="flex gap-2">
          {dirty && (
            <>
              <button
                onClick={discard}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-ui-border-base hover:bg-ui-bg-base-hover transition-colors text-ui-fg-subtle"
              >
                Discard
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-ui-button-inverted text-ui-fg-on-inverted hover:bg-ui-button-inverted-hover transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </>
          )}
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-ui-border-base hover:bg-ui-bg-base-hover transition-colors"
          >
            {showPicker ? "Close" : "+ Edit Collabs"}
          </button>
        </div>
      </div>

      {selectedBreweries.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedBreweries.map((b) => (
            <span
              key={b.slug}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-ui-bg-base-hover border-ui-border-base text-xs font-medium text-ui-fg-base"
            >
              {b.name}
              {b.location && <span className="text-ui-fg-subtle">· {b.location}</span>}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-ui-fg-subtle text-sm mb-2">
          No collab partners. Click &quot;+ Edit Collabs&quot; to add partner breweries.
        </p>
      )}

      {showPicker && (
        <div className="border border-ui-border-base rounded-lg p-3 mt-3">
          <input
            type="text"
            placeholder="Search breweries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-ui-border-base rounded-md mb-3 bg-ui-bg-field text-ui-fg-base placeholder:text-ui-fg-muted focus:outline-none focus:ring-2 focus:ring-ui-border-interactive"
          />
          <div className="max-h-64 overflow-y-auto space-y-0.5">
            {available.length === 0 ? (
              <p className="text-ui-fg-subtle text-sm py-2 text-center">No breweries found</p>
            ) : (
              available.map((b) => {
                const isSelected = selected.includes(b.slug)
                return (
                  <button
                    key={b.slug}
                    onClick={() => toggle(b.slug)}
                    className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-3 text-sm transition-colors ${
                      isSelected ? "bg-ui-bg-interactive text-ui-fg-on-color" : "hover:bg-ui-bg-base-hover"
                    }`}
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      isSelected ? "bg-ui-fg-interactive border-ui-fg-interactive" : "border-ui-border-base"
                    }`}>
                      {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                    </span>
                    <div className="flex-1">
                      <span className={isSelected ? "font-medium" : "text-ui-fg-base font-medium"}>{b.name}</span>
                      {b.location && (
                        <span className={`ml-2 text-xs ${isSelected ? "opacity-80" : "text-ui-fg-subtle"}`}>{b.location}</span>
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

export default ProductCollabsWidget
