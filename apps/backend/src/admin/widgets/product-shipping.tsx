import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect, useState } from "react"
import { sdk } from "../lib/sdk"

type VariantShipping = {
  id: string
  title: string
  weight: number | null
  format: string | null
  volumeMl: number | null
}

const ProductShippingWidget = ({ data }: { data: any }) => {
  const product = data
  const [variants, setVariants] = useState<VariantShipping[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await sdk.client.fetch<{ product: any }>(
          `/admin/products/${product.id}?fields=metadata,variants.id,variants.title,variants.weight,variants.options.value,variants.options.option.title`,
          { method: "GET" }
        )
        const p = res.product
        const volumeMl = p.metadata?.volume_ml ?? null
        const mapped = (p.variants ?? []).map((v: any) => {
          let format: string | null = null
          for (const opt of v.options ?? []) {
            if (opt.option?.title === "Format" || opt.option?.title === "format") {
              format = opt.value
            }
          }
          return { id: v.id, title: v.title, weight: v.weight, format, volumeMl }
        })
        setVariants(mapped)
      } catch {}
      setLoading(false)
    }
    fetch()
  }, [product.id])

  if (loading) {
    return (
      <div style={{ padding: "16px" }}>
        <p style={{ fontSize: "13px", color: "#6b7280" }}>Loading shipping info...</p>
      </div>
    )
  }

  if (!variants.length) return null

  const containerLabel = (format: string | null) => {
    if (!format) return "Can (default)"
    const f = format.toLowerCase()
    if (f.includes("bottle")) return "Bottle (510ml)"
    if (f.includes("crowler")) return "Crowler (1L)"
    return "Can (473ml)"
  }

  const boxLabel = (format: string | null) => {
    if (!format) return "Small/Medium (based on qty)"
    const f = format.toLowerCase()
    if (f.includes("bottle") || f.includes("crowler")) return "Large AusPost (39×28×14cm)"
    return "Small/Medium (based on qty)"
  }

  return (
    <div style={{ padding: "16px" }}>
      <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>
        Shipping Attributes
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {variants.map((v) => (
          <div key={v.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px", fontSize: "13px" }}>
            <div>
              <span style={{ color: "#6b7280", display: "block", marginBottom: "2px" }}>Format</span>
              <span style={{ fontWeight: 500 }}>{containerLabel(v.format)}</span>
            </div>
            <div>
              <span style={{ color: "#6b7280", display: "block", marginBottom: "2px" }}>Volume</span>
              <span style={{ fontWeight: 500 }}>{v.volumeMl ? `${v.volumeMl}ml` : "Not set"}</span>
            </div>
            <div>
              <span style={{ color: "#6b7280", display: "block", marginBottom: "2px" }}>Weight</span>
              <span style={{ fontWeight: 500 }}>{v.weight ? `${v.weight}g` : "Not set"}</span>
            </div>
            <div>
              <span style={{ color: "#6b7280", display: "block", marginBottom: "2px" }}>Box Size</span>
              <span style={{ fontWeight: 500 }}>{boxLabel(v.format)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductShippingWidget
