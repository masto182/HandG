// eslint-disable-next-line @typescript-eslint/no-require-imports
const checkEnvVariables = require("./check-env-variables")

globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  length: 0,
  key: () => null,
}

checkEnvVariables()

// Storage-generic image hosts. Comma-separated list of hostnames allowed for
// next/image remote patterns. Examples:
//   AWS S3 (region):   STOREFRONT_IMAGE_HOSTS=mybucket.s3.us-east-1.amazonaws.com
//   OCI Object Stg:    STOREFRONT_IMAGE_HOSTS=axyz.objectstorage.ap-sydney-1.oraclecloud.com
//   Cloudflare R2:     STOREFRONT_IMAGE_HOSTS=images.example.com
//   Self MinIO:        STOREFRONT_IMAGE_HOSTS=files.example.com
const imageHostnames = (process.env.STOREFRONT_IMAGE_HOSTS || "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean)

// Same-origin image proxy hosts. Product/brewery images are stored as absolute
// URLs like https://<domain>/files/<key> and served by the backend streaming
// proxy. next/image treats absolute URLs as "remote" even when same-origin, so
// the site's own domains must be in remotePatterns. These are not secret and
// are stable, so we bake them as defaults (one image is promoted staging->prod).
const SELF_IMAGE_HOSTS = [
  "hopsandglory.au",
  "www.hopsandglory.au",
  "staging.hopsandglory.au",
  // OCI Object Storage (ap-sydney-1) — production and staging buckets
  "objectstorage.ap-sydney-1.oraclecloud.com",
  "sdcddm8qvsbv.objectstorage.ap-sydney-1.oraclecloud.com",
]

const allImageHostnames = [...new Set([...imageHostnames, ...SELF_IMAGE_HOSTS])]

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  // When NEXT_REWRITES_BACKEND is set (e.g. in CI where the Medusa backend runs
  // on a different port than the storefront), proxy auth/store/admin requests
  // through the Next.js server so that session cookies are set on the same
  // origin as the storefront. In production, Caddy handles this routing and the
  // env var is left unset.
  ...(process.env.NEXT_REWRITES_BACKEND
    ? {
        async rewrites() {
          const backend = process.env.NEXT_REWRITES_BACKEND
          return [
            { source: "/auth/:path*", destination: `${backend}/auth/:path*` },
            { source: "/store/:path*", destination: `${backend}/store/:path*` },
            { source: "/admin/:path*", destination: `${backend}/admin/:path*` },
            { source: "/hooks/:path*", destination: `${backend}/hooks/:path*` },
          ]
        },
      }
    : {}),
  images: {
    // Explicit quality allowlist. Avoids Next 16 narrowing the default set and
    // hard-erroring on quality={50} used by Thumbnail for card images.
    qualities: [50, 75, 90],
    remotePatterns: [
      ...allImageHostnames.map((hostname) => ({
        protocol: "https",
        hostname,
      })),
      ...(process.env.NODE_ENV !== "production"
        ? [{ protocol: "http", hostname: "localhost" }]
        : []),
    ],
  },
}

module.exports = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? (() => {
      try {
        const { withSentryConfig } = require("@sentry/nextjs") // eslint-disable-line @typescript-eslint/no-require-imports
        return withSentryConfig(nextConfig, {
          silent: true,
          hideSourceMaps: true,
          disableLogger: true,
        })
      } catch {
        return nextConfig
      }
    })()
  : nextConfig
