import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260825140000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "email_log" ("id" text not null, "resend_id" text null, "to_address" text not null, "category" text not null, "template_name" text not null, "subject" text null, "customer_id" text null, "status" text not null default 'sent', "sent_at" timestamptz null, "last_event_at" timestamptz null, "delivered_at" timestamptz null, "opened_at" timestamptz null, "clicked_at" timestamptz null, "bounced_at" timestamptz null, "complained_at" timestamptz null, "open_count" integer not null default 0, "click_count" integer not null default 0, "error_reason" text null, "raw_events" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "email_log_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_email_log_deleted_at" ON "email_log" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_email_log_resend_id" ON "email_log" ("resend_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_email_log_customer_id" ON "email_log" ("customer_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "email_log" cascade;`)
  }
}
