import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260516120100 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "pickup_location" ("id" text not null, "name" text not null, "slug" text not null, "address_line_1" text not null, "address_line_2" text null, "city" text not null, "state" text not null, "postcode" text not null, "country_code" text not null default 'AU', "hours" jsonb null, "phone" text null, "notes" text null, "is_active" boolean not null default true, "sort_order" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "pickup_location_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_pickup_location_slug" ON "pickup_location" ("slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pickup_location_active" ON "pickup_location" ("is_active") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_pickup_location_deleted_at" ON "pickup_location" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "pickup_location" cascade;`);
  }

}
