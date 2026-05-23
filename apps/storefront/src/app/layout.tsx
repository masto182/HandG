import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import { headers } from "next/headers"
import "styles/globals.css"
import { buildOrganizationJsonLd, buildWebSiteJsonLd } from "@lib/util/json-ld"

import Providers from "@modules/layout/components/providers"
import { Toaster } from "sonner"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  title: "Hops & Glory | Private Collection",
  description:
    "A private collection of the most coveted, limited-release cans in existence. Membership by application or referral only.",
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const headersList = await headers()
  const nonce = headersList.get("x-nonce") || ""

  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('hl-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}else if(window.matchMedia('(prefers-color-scheme:light)').matches){document.documentElement.setAttribute('data-theme','light')}}catch(e){}})()`,
          }}
        />
        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
          <script
            nonce={nonce}
            suppressHydrationWarning
            defer
            data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
            src={process.env.NEXT_PUBLIC_PLAUSIBLE_SRC || "https://plausible.io/js/script.js"}
          />
        )}
      </head>
      <body className="bg-hg-bg text-hg-text">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildOrganizationJsonLd()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildWebSiteJsonLd()) }}
        />
        <Providers>
          <main className="relative">
            {props.children}
          </main>
        </Providers>
        <Toaster richColors position="top-center" theme="dark" />
      </body>
    </html>
  )
}
