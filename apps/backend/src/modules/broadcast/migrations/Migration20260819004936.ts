import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260819004936 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "broadcast" add column if not exists "channel_inapp" boolean not null default true, add column if not exists "channel_email" boolean not null default true, add column if not exists "create_banner" boolean not null default false, add column if not exists "banner_id" text null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "broadcast" drop column if exists "channel_inapp", drop column if exists "channel_email", drop column if exists "create_banner", drop column if exists "banner_id";`
    )
  }
}
