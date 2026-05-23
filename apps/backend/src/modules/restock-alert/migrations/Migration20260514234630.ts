import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260514234630 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "restock_alert" ("id" text not null, "customer_id" text not null, "beer_name" text not null, "brewery_name" text not null, "product_id" text null, "notified_at" timestamptz null, "tier_at_notification" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "restock_alert_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_restock_alert_deleted_at" ON "restock_alert" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "restock_alert" cascade;`);
  }

}
