#!/usr/bin/env bash
set -euo pipefail

# Regenerate migrations for every custom module under apps/backend/src/modules.
# Run from the repo root.

cd "$(dirname "$0")/../apps/backend"

echo "=== Generating migrations for all custom modules ==="

# Discover modules dynamically — anything with an index.ts that calls Module().
MODULES=()
for d in src/modules/*/; do
  name=$(basename "$d")
  if grep -q "Module(" "$d/index.ts" 2>/dev/null; then
    MODULES+=("$name")
  fi
done

for mod in "${MODULES[@]}"; do
  echo "--- $mod ---"
  pnpm exec medusa db:generate "$mod"
done

echo ""
echo "=== Verifying migration files created ==="
find src/modules -path "*/migrations/*.ts" -type f

echo ""
echo "=== DONE ==="
