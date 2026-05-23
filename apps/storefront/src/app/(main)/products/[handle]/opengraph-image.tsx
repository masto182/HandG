import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "Hops & Glory Product"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image({ params }: { params: { handle: string } }) {
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
  const pk = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

  let title = "Hops & Glory"
  let brewery = ""
  let style = ""

  try {
    // sdk-exempt: edge runtime does not support the Medusa SDK client
    const res = await fetch(`${backendUrl}/store/products?handle=${params.handle}&fields=title,metadata`, { // sdk-exempt
      headers: { "x-publishable-api-key": pk },
    })
    if (res.ok) {
      const data = await res.json()
      const product = data.products?.[0]
      if (product) {
        title = product.title || title
        brewery = product.metadata?.brewery_name || product.metadata?.brewery || ""
        style = product.metadata?.style || ""
      }
    }
  } catch {}

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #111715 0%, #171E1B 100%)",
          padding: "60px",
        }}
      >
        <div
          style={{
            color: "#63A987",
            fontSize: "24px",
            marginBottom: "20px",
            letterSpacing: "2px",
          }}
        >
          HOPS & GLORY
        </div>
        <div
          style={{
            color: "#ffffff",
            fontSize: "48px",
            fontWeight: 700,
            textAlign: "center",
            maxWidth: "900px",
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
        {brewery && (
          <div
            style={{
              color: "#63A987",
              fontSize: "28px",
              marginTop: "16px",
            }}
          >
            {brewery}
          </div>
        )}
        {style && (
          <div
            style={{
              color: "#999999",
              fontSize: "20px",
              marginTop: "12px",
              padding: "6px 20px",
              border: "1px solid #2F3A35",
              borderRadius: "20px",
            }}
          >
            {style}
          </div>
        )}
      </div>
    ),
    { ...size }
  )
}
