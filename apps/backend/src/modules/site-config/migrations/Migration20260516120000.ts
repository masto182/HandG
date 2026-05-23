import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260516120000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "site_config" ("id" text not null, "key" text not null, "value" jsonb not null, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "site_config_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_site_config_key" ON "site_config" ("key") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_site_config_deleted_at" ON "site_config" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "site_config_history" ("id" text not null, "key" text not null, "value_old" jsonb null, "value_new" jsonb null, "action" text check ("action" in ('set', 'unset')) not null, "actor" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "site_config_history_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_site_config_history_key" ON "site_config_history" ("key") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_site_config_history_created_at" ON "site_config_history" ("created_at" DESC) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_site_config_history_deleted_at" ON "site_config_history" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "site_config_history" cascade;`);
    this.addSql(`drop table if exists "site_config" cascade;`);
  }

}
