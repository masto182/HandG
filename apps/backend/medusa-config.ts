import { loadEnv, defineConfig } from '@medusajs/framework/utils'
import { requireEnv } from './src/lib/env'
import { initSentry } from './src/lib/sentry'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())
initSentry()

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    workerMode: process.env.MEDUSA_WORKER_MODE as "shared" | "worker" | "server" || "shared",
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: requireEnv("JWT_SECRET", "dev-jwt-secret-do-not-use-in-prod"),
      jwtExpiresIn: "7d",
      cookieSecret: requireEnv("COOKIE_SECRET", "dev-cookie-secret-do-not-use-in-prod"),
    },
  },
  admin: {
    disable: process.env.DISABLE_MEDUSA_ADMIN === "true",
    backendUrl: process.env.MEDUSA_BACKEND_URL,
    // Sprint 10: serve the Medusa admin UI at /troon/admin (single-domain
    // production model). Caddy routes /troon/admin/* to the backend; the
    // Medusa REST API still lives at /admin/* on the same backend port.
    path: (process.env.MEDUSA_ADMIN_PATH as `/${string}`) || "/troon/admin",
  },
  modules: [
    {
      resolve: "@medusajs/medusa/event-bus-redis",
      options: {
        redisUrl: process.env.REDIS_URL,
        jobOptions: {
          removeOnComplete: { age: 3600, count: 1000 },
          removeOnFail: { age: 3600, count: 1000 },
        },
      },
    },
    { resolve: "./src/modules/brewery" },
    { resolve: "./src/modules/beer-detail" },
    { resolve: "./src/modules/wishlist" },
    { resolve: "./src/modules/restock-alert" },
    { resolve: "./src/modules/vip-score" },
    { resolve: "./src/modules/referral" },
    { resolve: "./src/modules/announcement" },
    { resolve: "./src/modules/beer-style" },
    { resolve: "./src/modules/notification" },
    { resolve: "./src/modules/hop" },
    { resolve: "./src/modules/site-config" },
    { resolve: "./src/modules/pickup-location" },
    { resolve: "./src/modules/notification-preference" },
    { resolve: "./src/modules/email-change-request" },
    { resolve: "./src/modules/shipping-rate-history" },
    { resolve: "./src/modules/campaign" },
    { resolve: "@medusajs/index" },
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/file-s3",
            id: "s3",
            options: {
              file_url: requireEnv("S3_FILE_URL", "http://localhost:9100/medusa"),
              access_key_id: requireEnv("S3_ACCESS_KEY", "medusa"),
              secret_access_key: requireEnv("S3_SECRET_KEY", "medusa_dev_password"),
              region: process.env.S3_REGION || "us-east-1",
              bucket: requireEnv("S3_BUCKET", "medusa"),
              endpoint: process.env.S3_ENDPOINT || "http://localhost:9100",
              additional_client_config: {
                forcePathStyle: true,
              },
            },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "./src/modules/payment-payid",
            id: "payid",
            options: {
              payid_alias: process.env.PAYID_ALIAS || "payments@example.com",
            },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/fulfillment",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/fulfillment-manual",
            id: "manual",
          },
          {
            resolve: "./src/modules/shipengine",
            id: "shipengine",
            options: {
              api_key: process.env.SHIPENGINE_API_KEY,
              api_base: process.env.SHIPENGINE_API_BASE,
              carrier_ids: (process.env.SHIPENGINE_CARRIER_IDS || "se-5530570,se-5530571")
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean),
              default_weight_g: 750,
              from_name: "Hops & Glory",
              from_phone: "+61 400 000 000",
              from_address_1: "1 Hillside Lane",
              from_city: "Hillside",
              from_state: "VIC",
              from_postcode: "3037",
              from_country: "AU",
            },
          },
          {
            resolve: "./src/modules/auspost",
            id: "auspost",
            options: {
              api_key: process.env.AUSPOST_API_KEY,
              api_base: process.env.AUSPOST_API_BASE,
            },
          },
        ],
      },
    },

  ],
})
