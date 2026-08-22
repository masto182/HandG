import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260820150500 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "alert_dispatch" alter column "dispatched_at" drop not null;`
    )
    this.addSql(
      `alter table if exists "alert_dispatch" add column if not exists "email_delivery_id" text null;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_alert_dispatch_email_delivery_id" ON "alert_dispatch" ("email_delivery_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "alert_dispatch" drop column if exists "email_delivery_id";`)
    this.addSql(`alter table if exists "alert_dispatch" alter column "dispatched_at" set not null;`)
  }
}
