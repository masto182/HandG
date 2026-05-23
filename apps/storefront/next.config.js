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
  images: {
    remotePatterns: [
      ...imageHostnames.map((hostname) => ({
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
        const { withSentryConfig } = require("@sentry/nextjs")
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
