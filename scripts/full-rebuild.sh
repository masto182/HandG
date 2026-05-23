#!/usr/bin/env bash
set -euo pipefail

# Full local rebuild for the retail example.
# Drops and recreates the database, runs migrations, and runs the
# consolidated seed. Adopters typically swap the DB section for their
# own provisioning (Supabase, RDS, etc.).

: "${POSTGRES_CONTAINER:=retail-postgres-1}"
: "${POSTGRES_USER:=medusa}"
: "${POSTGRES_DB:=medusa}"
: "${BACKEND_DIR:=$(cd "$(dirname "$0")/../apps/backend" && pwd)}"
: "${ADMIN_EMAIL:=admin@example.test}"
: "${ADMIN_PASSWORD:=ChangeMe123!}"

echo "=== Terminating connections to ${POSTGRES_DB} ==="
docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();" || true

echo "=== Drop + recreate DB ==="
docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS ${POSTGRES_DB};"
docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE ${POSTGRES_DB} OWNER ${POSTGRES_USER};"

cd "$BACKEND_DIR"

echo "=== Run migrations ==="
pnpm exec medusa db:migrate --execute-safe-links 2>&1 | grep -E "Completed|Migrated|error|Error" | tail -20

echo "=== Reset index module ==="
docker exec "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "TRUNCATE index_data, index_relation CASCADE; DELETE FROM index_metadata;" || true

echo "=== Create admin user ==="
pnpm exec medusa user -e "$ADMIN_EMAIL" -p "$ADMIN_PASSWORD" 2>&1 | grep -E "created|error" || true

echo "=== Run consolidated seed ==="
pnpm exec medusa exec ./src/scripts/seed.ts 2>&1 | grep -E "info|error" || true

echo "=== Reindex search ==="
pnpm exec medusa exec ./src/scripts/reindex-search.ts 2>&1 | grep -E "Search|error" || true

echo ""
echo "=== FULL REBUILD COMPLETE ==="
