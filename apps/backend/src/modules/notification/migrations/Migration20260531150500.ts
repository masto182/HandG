import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260531150500 extends Migration {
  override async up(): Promise<void> {
    // Every in-app inbox read filters by customer_id; index it.
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_notification_customer_id" ON "notification" ("customer_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_notification_customer_id";`)
  }
}
