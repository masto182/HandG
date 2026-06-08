import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import IORedis from "ioredis"
import {
  RateLimiterRedis,
  RateLimiterMemory,
  type RateLimiterAbstract,
} from "rate-limiter-flexible"

let sharedClient: IORedis | null = null

function getRedisClient(): IORedis | null {
  if (sharedClient) return sharedClient
  const url = process.env.REDIS_URL
  if (!url) {
    return null
  }
  sharedClient = new IORedis(url, {
    enableOfflineQueue: false,
    maxRetriesPerRequest: 2,
    lazyConnect: false,
  })
  sharedClient.on("error", (err) => {
    // eslint-disable-next-line no-console
    console.error("[rate-limit] redis error:", err.message)
  })
  return sharedClient
}

const limiters = new Map<string, RateLimiterAbstract>()

function getLimiter(name: string, points: number, durationSec: number): RateLimiterAbstract {
  const cached = limiters.get(name)
  if (cached) return cached

  const redis = getRedisClient()
  const limiter: RateLimiterAbstract = redis
    ? new RateLimiterRedis({
        storeClient: redis,
        keyPrefix: `rl:${name}`,
        points,
        duration: durationSec,
      })
    : new RateLimiterMemory({
        keyPrefix: `rl:${name}`,
        points,
        duration: durationSec,
      })

  limiters.set(name, limiter)
  return limiter
}

function clientKey(req: MedusaRequest): string {
  const actorId = (req as any).auth_context?.actor_id
  if (actorId) return `actor:${actorId}`

  const fwd = req.headers["x-forwarded-for"]
  const rawIps = (Array.isArray(fwd) ? fwd.join(",") : (fwd?.toString() ?? ""))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  // Use the rightmost IP: set by our own trusted reverse proxy, not by the client.
  // The leftmost IP is attacker-controlled and can be spoofed.
  const ip = rawIps.length > 0 ? rawIps[rawIps.length - 1] : req.socket?.remoteAddress
  return `ip:${(ip || req.ip || "unknown").trim()}`
}

export function rateLimit(maxRequests: number, windowMs: number) {
  const durationSec = Math.max(1, Math.ceil(windowMs / 1000))
  const name = `${maxRequests}-${durationSec}`
  const limiter = getLimiter(name, maxRequests, durationSec)

  return async (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
    const key = `${clientKey(req)}:${req.path}`
    try {
      await limiter.consume(key, 1)
      return next()
    } catch (rejected: any) {
      if (rejected && typeof rejected.msBeforeNext === "number") {
        const retrySeconds = Math.max(1, Math.ceil(rejected.msBeforeNext / 1000))
        res.setHeader("Retry-After", retrySeconds.toString())
        res.status(429).json({
          error: "Too many requests. Please try again later.",
          retry_after_seconds: retrySeconds,
        })
        return
      }
      // Unexpected limiter failure (e.g. Redis down): fail-open to preserve
      // availability, but flag degraded state so monitoring can detect it.
      // eslint-disable-next-line no-console
      console.error("[rate-limit] limiter error:", rejected)
      res.setHeader("X-Rate-Limit-Degraded", "1")
      return next()
    }
  }
}
