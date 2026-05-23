import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import IORedis from "ioredis"
import { RateLimiterRedis, RateLimiterMemory, type RateLimiterAbstract } from "rate-limiter-flexible"

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

function getLimiter(
  name: string,
  points: number,
  durationSec: number
): RateLimiterAbstract {
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
  const ip = Array.isArray(fwd) ? fwd[0] : fwd?.toString().split(",")[0]
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
      // Unexpected limiter failure: fail-open but log.
      // eslint-disable-next-line no-console
      console.error("[rate-limit] limiter error:", rejected)
      return next()
    }
  }
}
