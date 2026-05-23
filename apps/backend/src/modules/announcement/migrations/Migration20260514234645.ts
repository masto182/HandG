import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260514234645 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "announcement" ("id" text not null, "message" text not null, "link_text" text null, "link_url" text null, "type" text check ("type" in ('info', 'warning', 'promo')) not null default 'info', "is_active" boolean not null default true, "starts_at" timestamptz null, "ends_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "announcement_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_announcement_deleted_at" ON "announcement" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "announcement" cascade;`);
  }

}
