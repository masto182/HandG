import { ImageResponse } from "next/og"

export const alt = "Hops & Glory — Private Collection"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image() {
  return new ImageResponse(
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
          fontSize: "44px",
          fontWeight: 700,
          letterSpacing: "8px",
          marginBottom: "28px",
        }}
      >
        HOPS & GLORY
      </div>
      <div
        style={{
          color: "#ffffff",
          fontSize: "64px",
          fontWeight: 700,
          textAlign: "center",
          maxWidth: "960px",
          lineHeight: 1.1,
        }}
      >
        Private Collection
      </div>
      <div
        style={{
          color: "#9FB7AC",
          fontSize: "26px",
          marginTop: "28px",
          textAlign: "center",
          maxWidth: "820px",
          lineHeight: 1.4,
        }}
      >
        The rarest of cans, you never expected to see in Australia
      </div>
    </div>,
    { ...size },
  )
}
