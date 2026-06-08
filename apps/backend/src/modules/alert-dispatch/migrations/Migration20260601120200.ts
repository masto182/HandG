import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260601120200 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "alert_dispatch" ("id" text not null, "customer_id" text not null, "product_id" text not null, "kind" text not null, "channel_email" boolean not null default false, "channel_inapp" boolean not null default false, "email_sent" boolean not null default false, "dispatched_at" timestamptz not null, "clicked_at" timestamptz null, "viewed_at" timestamptz null, "carted_at" timestamptz null, "ordered_at" timestamptz null, "order_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "alert_dispatch_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_alert_dispatch_product_id" ON "alert_dispatch" ("product_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_alert_dispatch_customer_id" ON "alert_dispatch" ("customer_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_alert_dispatch_customer_product" ON "alert_dispatch" ("customer_id", "product_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_alert_dispatch_deleted_at" ON "alert_dispatch" ("deleted_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "alert_dispatch" cascade;`)
  }
}
