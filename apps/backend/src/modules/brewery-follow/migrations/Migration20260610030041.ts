import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260610030041 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "brewery_follow" ("id" text not null, "customer_id" text not null, "brewery_id" text not null, "channel_email" boolean not null default true, "channel_inapp" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "brewery_follow_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_brewery_follow_deleted_at" ON "brewery_follow" ("deleted_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "brewery_follow" cascade;`)
  }
}
