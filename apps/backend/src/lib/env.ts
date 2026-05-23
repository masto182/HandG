const isProd = process.env.NODE_ENV === "production"

export function requireEnv(key: string, devDefault?: string): string {
  const val = process.env[key]
  if (val) return val
  if (isProd) {
    throw new Error(`[FATAL] Missing required env var: ${key}`)
  }
  return devDefault || `dev-${key}`
}
