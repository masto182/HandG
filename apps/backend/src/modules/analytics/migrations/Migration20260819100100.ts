import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260819100100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "storefront_event" add column if not exists "event_id" text null;`)
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_storefront_event_event_id" ON "storefront_event" ("event_id") WHERE event_id IS NOT NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_storefront_event_event_id";`)
    this.addSql(`alter table "storefront_event" drop column if exists "event_id";`)
  }
}
