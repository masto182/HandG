import { NextRequest, NextResponse } from "next/server"

const PROTECTED_ROUTES = ["/cart", "/checkout"]

// Storage-generic image hosts list, parsed once at module load.
// Read by both next.config.js and the CSP img-src directive so the
// allow-list is consistent across image optimisation and runtime.
const IMAGE_HOSTS = (process.env.STOREFRONT_IMAGE_HOSTS || "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean)

function buildImgSrc(isDev: boolean): string {
  const hosts = IMAGE_HOSTS.flatMap((h) => [`https://${h}`, `http://${h}`])
  const dev = isDev ? ["http://localhost:9100", "http://localhost:9000"] : []
  return ["'self'", "data:", "blob:", ...hosts, ...dev].join(" ")
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.includes(".")) {
    return NextResponse.next()
  }

  const isProtected = PROTECTED_ROUTES.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (isProtected) {
    const authCookie = request.cookies.get("_medusa_jwt")
    if (!authCookie?.value) {
      const loginUrl = new URL("/", request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64")
  const isDev = process.env.NODE_ENV !== "production"

  const csp = [
    `default-src 'self'`,
    isDev
      ? `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com`
      : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://maps.googleapis.com https://maps.gstatic.com`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `img-src ${buildImgSrc(isDev)}`,
    `font-src 'self' https://fonts.gstatic.com`,
    `connect-src 'self' ${
      process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
    } ${
      process.env.NEXT_PUBLIC_PLAUSIBLE_SRC
        ? new URL(process.env.NEXT_PUBLIC_PLAUSIBLE_SRC).origin
        : "https://plausible.io"
    } https://*.ingest.sentry.io https://*.sentry.io http://localhost:7700 ws://localhost:8000 https://maps.googleapis.com https://maps.gstatic.com`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `upgrade-insecure-requests`,
  ].join("; ")

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  const cacheIdCookie = request.cookies.get("_medusa_cache_id")
  if (!cacheIdCookie) {
    response.cookies.set("_medusa_cache_id", crypto.randomUUID(), {
      maxAge: 60 * 60 * 24 * 7,
    })
  }

  // Security headers.
  // HSTS is intentionally NOT set here — the Caddy edge owns HSTS as the
  // single source of truth (max-age 2y, includeSubDomains, preload). Setting
  // it in two places risks divergent values and breaks preload eligibility.
  response.headers.set("Content-Security-Policy", csp)
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("X-DNS-Prefetch-Control", "on")
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  )
  // Cross-origin isolation. same-origin defaults are safe for a storefront
  // that does not embed third-party iframes; relax to `unsafe-none` if you
  // start embedding cross-origin content.
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin")
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin")

  return response
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|assets|png|svg|jpg|jpeg|gif|webp).*)",
  ],
}
