import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260729064539 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "storefront_event" ("id" text not null, "event_type" text not null, "session_id" text not null, "customer_id" text null, "payload" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "storefront_event_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_storefront_event_deleted_at" ON "storefront_event" ("deleted_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "storefront_event" cascade;`)
  }
}
