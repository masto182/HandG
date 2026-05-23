import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260514234625 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "wishlist" ("id" text not null, "customer_id" text not null, "product_id" text not null, "mode" text not null default 'buy_later', "target_price" real null, "stock_threshold" integer not null default 2, "price_alert_sent" boolean not null default false, "admin_approved_offer" boolean not null default false, "admin_offer_price" real null, "admin_offer_expires_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "wishlist_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_wishlist_deleted_at" ON "wishlist" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "wishlist" cascade;`);
  }

}
