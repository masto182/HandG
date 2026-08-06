FROM node:24.18.0-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.20.0 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json apps/backend/
COPY packages/shared-types/package.json packages/shared-types/
RUN pnpm install --frozen-lockfile --filter=backend...

COPY packages/shared-types/ packages/shared-types/
# Build the shared-types workspace package to dist (plain JS) so the compiled
# server can require it without ts-node at runtime.
RUN cd packages/shared-types && pnpm build
COPY apps/backend/ apps/backend/
# TypeScript 6 needs extra heap during medusa build (tsc is more memory-intensive).
# verify-deps-before-run=false: deps are already installed from the frozen
# lockfile above. pnpm 11 defaults this to `install`, and because that install
# is filtered (--filter=backend...), the check always sees node_modules as out
# of sync with the full lockfile and silently re-resolves all 3 workspace
# projects over the network (pnpm#11865) — slow every build, and fatal when
# registry.npmjs.org returns 429.
RUN NODE_OPTIONS=--max-old-space-size=8192 \
    pnpm --config.verify-deps-before-run=false --filter=backend build

FROM node:24.18.0-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@11.20.0 --activate
RUN addgroup --system --gid 1001 medusa && adduser --system --uid 1001 medusa

COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=builder /app/apps/backend ./apps/backend
COPY --from=builder /app/packages/shared-types ./packages/shared-types
COPY --from=builder /app/node_modules ./node_modules

WORKDIR /app/apps/backend

RUN chown -R medusa:medusa /app

USER medusa

EXPOSE 9000

# Start the COMPILED server from .medusa/server (Medusa v2's production layout):
# the admin bundle is served from <cwd>/public/admin, so cwd must be .medusa/server.
# Running from /app/apps/backend looks in the wrong place and crashes with
# "Could not find index.html in the admin build directory". Calling the medusa
# binary directly (not npx) avoids a registry.npmjs.org lookup that hangs on
# restricted-egress hosts. WORKDIR stays /app/apps/backend so the deploy's
# migration step (./node_modules/.bin/medusa db:migrate) still resolves.
CMD ["sh", "-c", "cd /app/apps/backend/.medusa/server && exec /app/apps/backend/node_modules/.bin/medusa start"]
