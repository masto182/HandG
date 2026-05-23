// Jest setup stub. Medusa integration tests bootstrap their own app
// lifecycle via medusaIntegrationTestRunner; this file just loads test
// env vars if present.
try {
  // @ts-ignore - optional dep used only in test env
  const { loadEnv } = require("@medusajs/framework/utils")
  loadEnv("test", process.cwd())
} catch {
  // tolerate running unit tests without @medusajs/framework loaded first
}
