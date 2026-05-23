import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260516120500 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "wishlist" add column if not exists "campaign_id" text null;`);
    this.addSql(`alter table "wishlist" add column if not exists "promotion_id" text null;`);
    this.addSql(`alter table "wishlist" add column if not exists "promotion_code" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "wishlist" drop column if exists "campaign_id";`);
    this.addSql(`alter table "wishlist" drop column if exists "promotion_id";`);
    this.addSql(`alter table "wishlist" drop column if exists "promotion_code";`);
  }

}
