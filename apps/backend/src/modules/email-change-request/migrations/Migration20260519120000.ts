import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260519120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "email_change_request" ("id" text not null, "customer_id" text not null, "new_email" text not null, "token" text not null, "expires_at" timestamptz not null, "used_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "email_change_request_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_email_change_request_token" ON "email_change_request" ("token") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_email_change_request_customer_id" ON "email_change_request" ("customer_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_email_change_request_deleted_at" ON "email_change_request" ("deleted_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "email_change_request" cascade;`)
  }
}
