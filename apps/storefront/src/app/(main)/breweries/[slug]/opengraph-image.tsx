import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "Hops & Glory Brewery"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image({ params }: { params: { slug: string } }) {
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
  const pk = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

  let name = "Hops & Glory"
  let location = ""

  try {
    const res = await fetch(`${backendUrl}/store/breweries/${params.slug}`, { // sdk-exempt
      headers: { "x-publishable-api-key": pk },
    })
    if (res.ok) {
      const data = await res.json()
      if (data.brewery) {
        name = data.brewery.name || name
        location = data.brewery.location || ""
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
            fontSize: "56px",
            fontWeight: 700,
            textAlign: "center",
            maxWidth: "900px",
            lineHeight: 1.2,
          }}
        >
          {name}
        </div>
        {location && (
          <div
            style={{
              color: "#999999",
              fontSize: "24px",
              marginTop: "16px",
              padding: "8px 24px",
              border: "1px solid #2F3A35",
              borderRadius: "20px",
            }}
          >
            {location}
          </div>
        )}
      </div>
    ),
    { ...size }
  )
}
