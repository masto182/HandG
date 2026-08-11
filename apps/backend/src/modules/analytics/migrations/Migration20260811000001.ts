import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260811000001 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_storefront_event_customer_id_created_at" ON "storefront_event" ("customer_id", "created_at" DESC) WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_storefront_event_customer_id_created_at";`)
  }
}
