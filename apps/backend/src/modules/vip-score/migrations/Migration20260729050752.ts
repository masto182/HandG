import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260729050752 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "vip_event" ("id" text not null, "customer_id" text not null, "type" text not null, "reference_id" text not null, "points" integer not null, "note" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "vip_event_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_vip_event_deleted_at" ON "vip_event" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_vip_event_customer_type_ref" ON "vip_event" ("customer_id", "type", "reference_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_vip_event_customer_id" ON "vip_event" ("customer_id") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `alter table if exists "vip_score" add column if not exists "lifetime_points" integer not null default 0, add column if not exists "last_reconciled_at" timestamptz null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "vip_event" cascade;`)

    this.addSql(
      `alter table if exists "vip_score" drop column if exists "lifetime_points", drop column if exists "last_reconciled_at";`
    )
  }
}
