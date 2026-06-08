import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260531150000 extends Migration {
  override async up(): Promise<void> {
    // C6: real idempotency flag for low-stock alerts.
    this.addSql(
      `alter table if exists "wishlist" add column if not exists "stock_alert_sent" boolean not null default false;`
    )

    // Dedupe duplicate wishlist rows per (customer_id, product_id, mode) BEFORE
    // adding the unique index (keep the most recently updated).
    this.addSql(`
      UPDATE "wishlist" v
      SET "deleted_at" = now()
      WHERE "deleted_at" IS NULL
        AND EXISTS (
          SELECT 1 FROM "wishlist" w
          WHERE w."customer_id" = v."customer_id"
            AND w."product_id" = v."product_id"
            AND w."mode" = v."mode"
            AND w."deleted_at" IS NULL
            AND (w."updated_at" > v."updated_at"
                 OR (w."updated_at" = v."updated_at" AND w."id" > v."id"))
        );
    `)
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_wishlist_customer_product_mode" ON "wishlist" ("customer_id", "product_id", "mode") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "UQ_wishlist_customer_product_mode";`)
    this.addSql(`alter table if exists "wishlist" drop column if exists "stock_alert_sent";`)
  }
}
