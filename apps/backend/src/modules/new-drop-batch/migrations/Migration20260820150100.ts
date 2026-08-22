import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260820150100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "new_drop_batch_recipient_item" add column if not exists "channel_email" boolean not null default false, add column if not exists "channel_inapp" boolean not null default false;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "new_drop_batch_recipient_item" drop column if exists "channel_email", drop column if exists "channel_inapp";`
    )
  }
}
