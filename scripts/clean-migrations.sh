#!/bin/bash
set -e

BASE="/Users/cmasterson/Site-Build/apps/backend/src/modules"
MODULES=(brewery beer-detail wishlist restock-alert vip-score referral product-like announcement beer-style hop)

echo "=== Deleting all migration files + snapshots from ${#MODULES[@]} modules ==="

TOTAL=0
for mod in "${MODULES[@]}"; do
  DIR="$BASE/$mod/migrations"
  if [ -d "$DIR" ]; then
    COUNT=$(find "$DIR" -type f | wc -l | tr -d ' ')
    echo "  $mod: removing $COUNT files"
    rm -rf "$DIR"/*
    TOTAL=$((TOTAL + COUNT))
  else
    echo "  $mod: no migrations/ dir found"
  fi
done

echo ""
echo "=== Deleted $TOTAL files total ==="
echo ""
echo "=== Verifying empty migrations dirs ==="
for mod in "${MODULES[@]}"; do
  DIR="$BASE/$mod/migrations"
  if [ -d "$DIR" ]; then
    REMAINING=$(find "$DIR" -type f | wc -l | tr -d ' ')
    echo "  $mod/migrations/: $REMAINING files remaining"
  fi
done
echo ""
echo "=== DONE ==="
