# Incident response

## Triage order

1. **Is the site up?** `curl -fsS https://example.com/health` and `/api/health`. If both 200, problem is application-level; check Sentry. If either fails, jump to step 2.
2. **Is the host up?** `ssh cmasterson@<oracle-ip>`. If unreachable, check Oracle Cloud console -> Instances -> reboot.
3. **Are containers up?** `cd /opt/retail-example && docker compose -f docker-compose.prod.yml ps`. Look for unhealthy or restarting services.
4. **Recent deploy?** Check GitHub Actions -> Deployments. If the last green deploy is < 1 h old, run `Rollback production` workflow.

## Rollback (last known good)

GitHub Actions -> `Rollback production` -> Run workflow. Re-tags `:previous` as `:prod` and redeploys.

If you need to rollback to something older than the most-recent previous deploy:

```bash
# Pick a sha from ghcr.io/sfc-gh-cmasterson/backend tags
docker buildx imagetools create \
  -t ghcr.io/sfc-gh-cmasterson/backend:prod \
  ghcr.io/sfc-gh-cmasterson/backend:sha-<short>
docker buildx imagetools create \
  -t ghcr.io/sfc-gh-cmasterson/storefront:prod \
  ghcr.io/sfc-gh-cmasterson/storefront:sha-<short>
```

Then run `Rollback production` (it pulls whatever is currently tagged `:prod`).

## Restore from backup

```bash
ssh cmasterson@<oracle-ip>
oci os object list --namespace $(oci os ns get --query data --raw-output) \
  --bucket-name retail-example-backups --prefix daily/
sudo BACKUP_ENV_FILE=/etc/retail-example/backup.env \
  /opt/retail-example/scripts/restore-postgres.sh daily/retail-YYYYMMDD-HHMMSS.sql.gz
```

The script prompts for explicit DB name confirmation before dropping data. After restore:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec backend npx medusa db:migrate
```

## Key rotation

- **JWT_SECRET / COOKIE_SECRET**: changing logs out all users. Rotate by updating `.env.production`, run `docker compose up -d` to recreate backend.
- **Database password**: rotate via `ALTER ROLE medusa WITH PASSWORD 'new'` inside the postgres container, then update `.env.production`, then `docker compose up -d` for backend (which holds the connection pool).
- **Resend / ShipEngine / AusPost / Google Maps**: regenerate in vendor dashboard, update env, restart affected service.
- **SHIPENGINE_WEBHOOK_SECRET**: update env first, restart backend, **then** update the ShipEngine webhook subscription to use the new secret. Order matters or you drop events during the gap.

## Heat hold drill

If you discover a heat-wave forecast and need to halt outbound shipments:

```
admin -> Site Config -> shipping_heat_hold_enabled -> true
```

Storefront banner appears immediately; ready-to-ship returns 409 HEAT_HOLD_BLOCKED. To resume, flip the same flag back to false.

## ShipEngine webhook is firing but events not landing

1. Check `docker compose logs backend | grep shipengine-webhook`. A 401 means secret mismatch — the env on the host doesn't match the URL configured in the ShipEngine dashboard.
2. A 202 with "missing tracking_number" means ShipEngine sent a non-track payload (e.g. address-validation echo) — safe to ignore.
3. A `fulfillment lookup failed` warning means the tracking number doesn't match any fulfillment label — usually because a manual lodgement (AusPost) wasn't recorded with the tracking number. Use the AusPost tracking admin route to record it.

## Caddy cert renewal failure

Caddy auto-renews 30 days before expiry. If renewal fails:

```bash
docker compose logs caddy | grep -i acme
docker compose restart caddy
```

If still failing, confirm port 80 is reachable from the public internet (Let's Encrypt's HTTP-01 challenge needs it). Cloudflare DNS-only mode does not block this; orange cloud (proxied) would.

## Postgres disk full

```bash
df -h
sudo du -sh /var/lib/docker/volumes/retail-example_pg_data
docker compose -f docker-compose.prod.yml exec postgres psql -U medusa -d medusa -c "SELECT pg_size_pretty(pg_database_size('medusa'));"
```

Buy more block storage (Oracle console -> Block Volumes -> resize) and `sudo growpart` + `sudo resize2fs` the mount.

## Always Free reclaim

Oracle reclaims idle ARM A1.Flex instances. UptimeRobot probes generate enough traffic to keep the instance non-idle. If you receive a reclaim warning email, respond by logging into the console and confirming retention.
