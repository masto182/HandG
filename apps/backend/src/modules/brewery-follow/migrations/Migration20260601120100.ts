import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260601120100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "brewery_follow" add column if not exists "channel_email" boolean not null default true;`
    )
    this.addSql(
      `alter table if exists "brewery_follow" add column if not exists "channel_inapp" boolean not null default true;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "brewery_follow" drop column if exists "channel_email";`)
    this.addSql(`alter table if exists "brewery_follow" drop column if exists "channel_inapp";`)
  }
}
