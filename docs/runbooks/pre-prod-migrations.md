# Pre-Prod Migrations Checklist

Run command (from repo root):

```bash
pnpm --filter ./apps/backend exec medusa db:migrate
```

Verify all migrations are applied:

```bash
pnpm --filter ./apps/backend exec medusa db:migration:show
```

---

## Migration inventory (post-initial-commit)

All migrations were added after the initial commit. They run automatically via `db:migrate`. This list is the DBA reference for verifying a clean run or diagnosing a partial failure.

| File                             | Module               | Change                                                                                                                                                |
| -------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Migration20260516120500`        | wishlist             | +campaign_id, +promotion_id, +promotion_code columns                                                                                                  |
| `Migration20260519120000`        | email-change-request | NEW TABLE email_change_request (id, customer_id, new_email, token, expires_at, used_at)                                                               |
| `Migration20260520065337`        | wishlist             | duplicate columns from 120500 (idempotent IF NOT EXISTS, safe)                                                                                        |
| `Migration20260531120000`        | restock-alert        | +restock_detected_at (dateTime nullable); IDX_restock_alert_product_id; IDX_restock_alert_customer_id                                                 |
| `Migration20260531130000`        | vip-score            | dedup rows (keep most recent per customer) THEN UQ_vip_score_customer_id partial unique                                                               |
| `Migration20260531140000`        | referral             | +reward_sent_at; UQ_referral_referred_customer_id; UQ_referral_code; NEW TABLE referral_code (id, customer_id, code); backfill from customer.metadata |
| `Migration20260531150000`        | wishlist             | +stock_alert_sent; UQ_wishlist_customer_product_mode (customer_id, product_id, mode)                                                                  |
| `Migration20260531150500`        | notification         | IDX_notification_customer_id                                                                                                                          |
| `Migration20260601120000`        | hop-alert            | NEW TABLE hop_alert (id, customer_id, hop_id, channel_email, channel_inapp); indexes                                                                  |
| `Migration20260601120100`        | brewery-follow       | +channel_email, +channel_inapp columns                                                                                                                |
| `Migration20260601120200`        | alert-dispatch       | NEW TABLE alert_dispatch with tracking columns; composite unique index                                                                                |
| `Migration20260602_hop_metadata` | hop                  | +country_code, +breeder, +available_forms (jsonb), +farm_notes columns                                                                                |
| `Migration20260608120000`        | vip-score            | DROP COLUMN network_spend_12mo                                                                                                                        |

---

## Notes

**email_change_request table**: Was created manually in the dev DB during Sprint 11 testing. `db:migrate` will apply it from the migration file on any fresh database. If running against the existing dev DB, the migration will no-op (table already exists).

**Notification module rename (inbox)**: The module DI key changed from `"notification"` to `"inbox"` in code. The **DB table** remains named `notification` — no schema change needed for this rename.

**vip-score dedup (Migration20260531130000)**: Runs a dedup before adding the unique constraint. If the live DB has duplicate vip_score rows per customer, the migration handles cleanup automatically. Verify with:

```sql
SELECT customer_id, COUNT(*) FROM vip_score WHERE deleted_at IS NULL GROUP BY customer_id HAVING COUNT(*) > 1;
```

**wishlist dedup (Migration20260531150000)**: Same dedup pattern before adding UQ_wishlist_customer_product_mode.

---

## Post-migration checks

```sql
-- Verify unique constraints applied
SELECT conname, contype FROM pg_constraint WHERE conname IN (
  'UQ_vip_score_customer_id',
  'IDX_wishlist_customer_product_mode',
  'UQ_referral_referred_customer_id'
);

-- Verify network_spend_12mo dropped
SELECT column_name FROM information_schema.columns
WHERE table_name = 'vip_score' AND column_name = 'network_spend_12mo';
-- Should return 0 rows.

-- Confirm email_change_request table exists
SELECT COUNT(*) FROM email_change_request;
```
