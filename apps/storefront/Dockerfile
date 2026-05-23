FROM node:20.20.2-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/storefront/package.json apps/storefront/
COPY packages/shared-types/package.json packages/shared-types/
RUN pnpm install --frozen-lockfile --filter=storefront...

COPY packages/shared-types/ packages/shared-types/
COPY apps/storefront/ apps/storefront/

ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=true

RUN cd apps/storefront && pnpm build

FROM node:20.20.2-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/storefront/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/storefront/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/storefront/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
