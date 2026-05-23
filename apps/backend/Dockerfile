FROM node:20.20.2-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared-types/package.json packages/shared-types/
RUN pnpm install --frozen-lockfile --filter=backend...

COPY packages/shared-types/ packages/shared-types/
COPY apps/backend/ apps/backend/
RUN cd apps/backend && pnpm build

FROM node:20.20.2-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@10.33.2 --activate
RUN addgroup --system --gid 1001 medusa && adduser --system --uid 1001 medusa

COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=builder /app/apps/backend ./apps/backend
COPY --from=builder /app/node_modules ./node_modules

WORKDIR /app/apps/backend

RUN chown -R medusa:medusa /app

USER medusa

EXPOSE 9000

CMD ["npx", "medusa", "start"]
