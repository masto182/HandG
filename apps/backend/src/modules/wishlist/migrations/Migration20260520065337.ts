import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260520065337 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "wishlist" add column if not exists "campaign_id" text null, add column if not exists "promotion_id" text null, add column if not exists "promotion_code" text null, add column if not exists "metadata" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "wishlist" drop column if exists "campaign_id", drop column if exists "promotion_id", drop column if exists "promotion_code", drop column if exists "metadata";`);
  }

}
