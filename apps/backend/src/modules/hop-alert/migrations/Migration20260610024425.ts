import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260610024425 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "hop_alert" ("id" text not null, "customer_id" text not null, "hop_id" text not null, "channel_email" boolean not null default true, "channel_inapp" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "hop_alert_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_hop_alert_deleted_at" ON "hop_alert" ("deleted_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "hop_alert" cascade;`)
  }
}
