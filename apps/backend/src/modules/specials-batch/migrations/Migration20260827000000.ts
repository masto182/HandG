import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260827000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "specials_batch" ("id" text not null, "label" text null, "status" text check ("status" in ('sending', 'sent', 'failed')) not null default 'sending', "campaign_count" integer not null default 0, "recipient_count" integer not null default 0, "sent_count" integer not null default 0, "failed_count" integer not null default 0, "created_by" text null, "sent_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "specials_batch_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_specials_batch_deleted_at" ON "specials_batch" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_specials_batch_status" ON "specials_batch" ("status") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "specials_batch_item" ("id" text not null, "batch_id" text not null, "campaign_id" text not null, "product_id" text not null, "product_title" text not null, "product_handle" text not null, "product_thumbnail" text null, "original_price" integer not null, "discounted_price" integer not null, "discount_type" text check ("discount_type" in ('percentage', 'fixed')) not null, "discount_value" integer not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "specials_batch_item_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_specials_batch_item_deleted_at" ON "specials_batch_item" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_specials_batch_item_batch_id" ON "specials_batch_item" ("batch_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_specials_batch_item_campaign_id" ON "specials_batch_item" ("campaign_id") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "specials_batch_recipient" ("id" text not null, "batch_id" text not null, "customer_id" text not null, "inapp_sent" boolean not null default false, "dispatched_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "specials_batch_recipient_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_specials_batch_recipient_deleted_at" ON "specials_batch_recipient" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_specials_batch_recipient_batch_customer_unique" ON "specials_batch_recipient" ("batch_id", "customer_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_specials_batch_recipient_batch_dispatched" ON "specials_batch_recipient" ("batch_id", "dispatched_at") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "specials_email_delivery" ("id" text not null, "recipient_id" text not null, "status" text check ("status" in ('pending', 'retry', 'sent', 'skipped', 'failed')) not null default 'pending', "attempts" integer not null default 0, "next_attempt_at" timestamptz null, "sent_at" timestamptz null, "skip_reason" text null, "last_error" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "specials_email_delivery_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_specials_email_delivery_deleted_at" ON "specials_email_delivery" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_specials_email_delivery_recipient_unique" ON "specials_email_delivery" ("recipient_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_specials_email_delivery_status_next_attempt" ON "specials_email_delivery" ("status", "next_attempt_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "specials_email_delivery" cascade;`)
    this.addSql(`drop table if exists "specials_batch_recipient" cascade;`)
    this.addSql(`drop table if exists "specials_batch_item" cascade;`)
    this.addSql(`drop table if exists "specials_batch" cascade;`)
  }
}
