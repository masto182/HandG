FROM node:24.18.0-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.20.0 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/storefront/package.json apps/storefront/
COPY packages/shared-types/package.json packages/shared-types/
RUN pnpm install --frozen-lockfile --filter=storefront...

COPY packages/shared-types/ packages/shared-types/
# Build shared-types to dist so the Next build resolves it as compiled JS
# (its package main now points at dist/index.js).
RUN cd packages/shared-types && pnpm build
COPY apps/storefront/ apps/storefront/

ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=true

ARG NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=$NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

ARG NEXT_PUBLIC_STORE_URL
ENV NEXT_PUBLIC_STORE_URL=$NEXT_PUBLIC_STORE_URL

ARG STOREFRONT_IMAGE_HOSTS
ENV STOREFRONT_IMAGE_HOSTS=$STOREFRONT_IMAGE_HOSTS

# verify-deps-before-run=false: deps are already installed from the frozen
# lockfile above. pnpm 11 defaults this to `install`, and because that install
# is filtered (--filter=storefront...), the check always sees node_modules as
# out of sync with the full lockfile and silently re-resolves all 3 workspace
# projects over the network (pnpm#11865) — slow every build, and fatal when
# registry.npmjs.org returns 429.
RUN NODE_OPTIONS=--max-old-space-size=8192 \
    pnpm --config.verify-deps-before-run=false --filter=storefront build

FROM node:24.18.0-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Next standalone output uses the monorepo layout (server.js lives under
# apps/storefront/, alongside a hoisted node_modules and the workspace packages),
# because shared-types is now a real dist package so Next's outputFileTracingRoot
# resolves to the monorepo root. Copy static/public under apps/storefront and run
# server.js from there.
COPY --from=builder --chown=nextjs:nodejs /app/apps/storefront/.next/standalone ./
COPY --from=builder /app/apps/storefront/public ./apps/storefront/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/storefront/.next/static ./apps/storefront/.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/storefront/server.js"]
