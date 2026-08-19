import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260819100000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "storefront_session" ("id" text not null, "customer_id" text null, "started_at" timestamptz not null, "last_seen_at" timestamptz not null, "ended_at" timestamptz null, "page_count" integer not null default 0, "active_seconds" integer not null default 0, "entry_path" text null, "last_path" text null, "referrer" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "storefront_session_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_storefront_session_deleted_at" ON "storefront_session" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_storefront_session_customer_id_last_seen_at" ON "storefront_session" ("customer_id", "last_seen_at" DESC) WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "storefront_session" cascade;`)
  }
}
