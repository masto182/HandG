import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260516120400 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "notification_preference" ("id" text not null, "customer_id" text not null, "category" text not null, "enabled" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "notification_preference_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_notification_preference_customer_category" ON "notification_preference" ("customer_id", "category") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_notification_preference_customer_id" ON "notification_preference" ("customer_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_notification_preference_deleted_at" ON "notification_preference" ("deleted_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "notification_preference" cascade;`)
  }
}
