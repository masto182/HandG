import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260818105323 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "broadcast" ("id" text not null, "title" text not null, "body" text not null, "link_text" text null, "link_url" text null, "segment_filter" jsonb null, "status" text check ("status" in ('draft', 'sending', 'sent', 'failed')) not null default 'draft', "recipient_count" integer not null default 0, "sent_count" integer not null default 0, "failed_count" integer not null default 0, "created_by" text null, "sent_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "broadcast_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_broadcast_deleted_at" ON "broadcast" ("deleted_at") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "broadcast_recipient" ("id" text not null, "broadcast_id" text not null, "customer_id" text not null, "inapp_sent" boolean not null default false, "email_sent" boolean not null default false, "email_attempts" integer not null default 0, "dispatched_at" timestamptz null, "skip_reason" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "broadcast_recipient_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_broadcast_recipient_deleted_at" ON "broadcast_recipient" ("deleted_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "broadcast" cascade;`)

    this.addSql(`drop table if exists "broadcast_recipient" cascade;`)
  }
}
