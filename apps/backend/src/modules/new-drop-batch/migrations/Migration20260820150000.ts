import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260820150000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "new_drop_queue" ("id" text not null, "product_id" text not null, "brewery_id" text null, "brewery_name" text null, "brewery_slug" text null, "status" text check ("status" in ('pending', 'batched', 'sent', 'skipped')) not null default 'pending', "queued_at" timestamptz not null, "batch_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "new_drop_queue_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_new_drop_queue_deleted_at" ON "new_drop_queue" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_new_drop_queue_product_id_unique" ON "new_drop_queue" ("product_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_new_drop_queue_status_queued_at" ON "new_drop_queue" ("status", "queued_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_new_drop_queue_batch_id" ON "new_drop_queue" ("batch_id") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "new_drop_batch" ("id" text not null, "label" text null, "status" text check ("status" in ('sending', 'sent', 'failed')) not null default 'sending', "product_count" integer not null default 0, "recipient_count" integer not null default 0, "email_delivery_count" integer not null default 0, "sent_count" integer not null default 0, "failed_count" integer not null default 0, "created_by" text null, "sent_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "new_drop_batch_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_new_drop_batch_deleted_at" ON "new_drop_batch" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_new_drop_batch_status" ON "new_drop_batch" ("status") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "new_drop_batch_item" ("id" text not null, "batch_id" text not null, "product_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "new_drop_batch_item_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_new_drop_batch_item_deleted_at" ON "new_drop_batch_item" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_new_drop_batch_item_batch_product_unique" ON "new_drop_batch_item" ("batch_id", "product_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_new_drop_batch_item_batch_id" ON "new_drop_batch_item" ("batch_id") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "new_drop_batch_recipient" ("id" text not null, "batch_id" text not null, "customer_id" text not null, "link_url" text not null, "inapp_sent" boolean not null default false, "dispatched_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "new_drop_batch_recipient_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_new_drop_batch_recipient_deleted_at" ON "new_drop_batch_recipient" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_new_drop_batch_recipient_batch_customer_unique" ON "new_drop_batch_recipient" ("batch_id", "customer_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_new_drop_batch_recipient_batch_dispatched" ON "new_drop_batch_recipient" ("batch_id", "dispatched_at") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "new_drop_batch_recipient_item" ("id" text not null, "recipient_id" text not null, "product_id" text not null, "kind" text check ("kind" in ('hop', 'brewery', 'all_new')) not null, "category" text check ("category" in ('hop_alerts', 'brewery_releases', 'new_drops')) not null, "alert_dispatch_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "new_drop_batch_recipient_item_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_new_drop_batch_recipient_item_deleted_at" ON "new_drop_batch_recipient_item" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_new_drop_batch_recipient_item_recipient_product_unique" ON "new_drop_batch_recipient_item" ("recipient_id", "product_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_new_drop_batch_recipient_item_recipient_id" ON "new_drop_batch_recipient_item" ("recipient_id") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "new_drop_email_delivery" ("id" text not null, "recipient_id" text not null, "category" text check ("category" in ('hop_alerts', 'brewery_releases', 'new_drops')) not null, "status" text check ("status" in ('pending', 'retry', 'sent', 'skipped', 'failed')) not null default 'pending', "attempts" integer not null default 0, "next_attempt_at" timestamptz null, "sent_at" timestamptz null, "skip_reason" text null, "last_error" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "new_drop_email_delivery_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_new_drop_email_delivery_deleted_at" ON "new_drop_email_delivery" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_new_drop_email_delivery_recipient_category_unique" ON "new_drop_email_delivery" ("recipient_id", "category") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_new_drop_email_delivery_status_next_attempt" ON "new_drop_email_delivery" ("status", "next_attempt_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "new_drop_email_delivery" cascade;`)
    this.addSql(`drop table if exists "new_drop_batch_recipient_item" cascade;`)
    this.addSql(`drop table if exists "new_drop_batch_recipient" cascade;`)
    this.addSql(`drop table if exists "new_drop_batch_item" cascade;`)
    this.addSql(`drop table if exists "new_drop_batch" cascade;`)
    this.addSql(`drop table if exists "new_drop_queue" cascade;`)
  }
}
