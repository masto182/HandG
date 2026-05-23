import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260514234614 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "brewery" drop constraint if exists "brewery_slug_unique";`);
    this.addSql(`create table if not exists "brewery" ("id" text not null, "name" text not null, "slug" text not null, "description" text null, "location" text null, "logo_url" text null, "hero_image_url" text null, "website_url" text null, "untappd_url" text null, "facebook_url" text null, "instagram_url" text null, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "brewery_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_brewery_slug_unique" ON "brewery" ("slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_brewery_deleted_at" ON "brewery" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "brewery" cascade;`);
  }

}
