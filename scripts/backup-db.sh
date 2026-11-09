#!/usr/bin/env bash
# Nightly Postgres backup for the production host.
#
# Dumps the running compose postgres container in custom format, verifies the
# dump is readable by pg_restore, then prunes dumps older than RETENTION_DAYS.
# Exits non-zero on any failure so cron mail / the log shows a broken backup
# rather than a silent empty file.
#
# Install (prod host): copy to /home/ubuntu/bin/backup-db.sh (outside the repo
# checkout, which deploys reset), chmod 700, then install the systemd units in
# scripts/systemd/ (the host has no cron):
#   sudo cp scripts/systemd/handg-db-backup.{service,timer} /etc/systemd/system/
#   sudo systemctl daemon-reload && sudo systemctl enable --now handg-db-backup.timer
# Check: systemctl list-timers handg-db-backup.timer; tail /home/ubuntu/db-backups/backup.log
#   (16:30 UTC = 03:30 Sydney during AEDT)
#
# Restore:
#   docker exec -i retail-example-postgres-1 sh -c \
#     'pg_restore -U $POSTGRES_USER -d $POSTGRES_DB --clean --if-exists' < <dump>
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/home/ubuntu/db-backups}"
CONTAINER="${PG_CONTAINER:-retail-example-postgres-1}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
MIN_TABLES="${MIN_TABLES:-100}"

mkdir -p "$BACKUP_DIR"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
out="$BACKUP_DIR/nightly-$stamp.dump"
tmp="$out.partial"

echo "[$(date -u +%FT%TZ)] backup start -> $out"
docker exec "$CONTAINER" sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$tmp"

tables=$(docker exec -i "$CONTAINER" pg_restore --list < "$tmp" | grep -c 'TABLE DATA' || true)
if [ "$tables" -lt "$MIN_TABLES" ]; then
  echo "[$(date -u +%FT%TZ)] ERROR: dump has only $tables tables (expected >= $MIN_TABLES); keeping $tmp for inspection"
  exit 1
fi

mv "$tmp" "$out"
chmod 600 "$out"
echo "[$(date -u +%FT%TZ)] backup ok: $(du -h "$out" | cut -f1), $tables tables"

find "$BACKUP_DIR" -maxdepth 1 -name 'nightly-*.dump' -mtime +"$RETENTION_DAYS" -print -delete
