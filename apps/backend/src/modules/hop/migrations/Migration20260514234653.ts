import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260514234653 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "hop" drop constraint if exists "hop_slug_unique";`);
    this.addSql(`create table if not exists "hop" ("id" text not null, "name" text not null, "slug" text not null, "origin" text null, "flavor_profile" text null, "description" text null, "image_url" text null, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "hop_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_hop_slug_unique" ON "hop" ("slug") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_hop_deleted_at" ON "hop" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "hop" cascade;`);
  }

}
