import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260531120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "restock_alert" add column if not exists "restock_detected_at" timestamptz null;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_restock_alert_product_id" ON "restock_alert" ("product_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_restock_alert_customer_id" ON "restock_alert" ("customer_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_restock_alert_customer_id";`)
    this.addSql(`DROP INDEX IF EXISTS "IDX_restock_alert_product_id";`)
    this.addSql(
      `alter table if exists "restock_alert" drop column if exists "restock_detected_at";`
    )
  }
}
