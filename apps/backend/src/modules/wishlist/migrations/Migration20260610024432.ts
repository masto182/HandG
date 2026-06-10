import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260610024432 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "wishlist" add column if not exists "stock_alert_sent" boolean not null default false;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "wishlist" drop column if exists "stock_alert_sent";`)
  }
}
