import { getBaseURL } from "@lib/util/env"
import { Metadata, Viewport } from "next"
import { headers } from "next/headers"
import "styles/globals.css"
import {
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
  serializeJsonLd,
} from "@lib/util/json-ld"

import Providers from "@modules/layout/components/providers"
import { Toaster } from "sonner"

const shareDescription =
  "The rarest of cans, you never expected to see in Australia"

// Derive the absolute base URL from the incoming request so og:image / og:url
// resolve correctly on whatever host serves the page (staging or prod), since
// the same built image is promoted across environments. Falls back to the
// build-time base URL when no host header is present.
async function resolveBaseUrl(): Promise<string> {
  const h = await headers()
  const host = h.get("x-forwarded-host") || h.get("host")
  if (host) {
    const proto =
      h.get("x-forwarded-proto") ||
      (host.includes("localhost") ? "http" : "https")
    return `${proto}://${host}`
  }
  return getBaseURL()
}

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = await resolveBaseUrl()
  return {
    metadataBase: new URL(baseUrl),
    title: "Hops & Glory | Private Collection",
    description:
      "A private collection of the most coveted, limited-release cans in existence. Membership by application or referral only.",
    openGraph: {
      type: "website",
      siteName: "Hops & Glory",
      title: "Hops & Glory | Private Collection",
      description: shareDescription,
      url: baseUrl,
    },
    twitter: {
      card: "summary_large_image",
      title: "Hops & Glory | Private Collection",
      description: shareDescription,
    },
  }
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const headersList = await headers()
  const nonce = headersList.get("x-nonce") || ""

  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('hl-theme');if(t==='light'){document.documentElement.setAttribute('data-theme','light')}}catch(e){}})()`,
          }}
        />
        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
          <script
            nonce={nonce}
            suppressHydrationWarning
            defer
            data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
            src={
              process.env.NEXT_PUBLIC_PLAUSIBLE_SRC ||
              "https://plausible.io/js/script.js"
            }
          />
        )}
      </head>
      <body className="bg-hg-bg text-hg-text">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(buildOrganizationJsonLd()),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(buildWebSiteJsonLd()),
          }}
        />
        <Providers>
          <main className="relative">{props.children}</main>
        </Providers>
        <Toaster richColors position="top-center" theme="dark" />
      </body>
    </html>
  )
}
