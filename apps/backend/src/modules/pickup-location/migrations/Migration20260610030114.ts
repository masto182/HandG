import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260610030114 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "pickup_location" drop constraint if exists "pickup_location_slug_unique";`
    )
    this.addSql(
      `alter table if exists "pickup_location" drop constraint if exists "pickup_location_stock_location_id_unique";`
    )
    this.addSql(
      `create table if not exists "pickup_location" ("id" text not null, "stock_location_id" text not null, "slug" text not null, "hours" jsonb null, "phone" text null, "notes" text null, "is_active" boolean not null default true, "sort_order" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pickup_location_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_pickup_location_stock_location_id_unique" ON "pickup_location" ("stock_location_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_pickup_location_slug_unique" ON "pickup_location" ("slug") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_pickup_location_deleted_at" ON "pickup_location" ("deleted_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "pickup_location" cascade;`)
  }
}
