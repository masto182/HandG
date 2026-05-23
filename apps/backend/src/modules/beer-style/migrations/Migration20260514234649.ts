import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260514234649 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "beer_style" ("id" text not null, "name" text not null, "slug" text not null, "family" text not null, "description" text null, "color_hex" text null, "sort_order" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "beer_style_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_beer_style_deleted_at" ON "beer_style" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "beer_style" cascade;`);
  }

}
