import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260610024439 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "referral_code" ("id" text not null, "customer_id" text not null, "code" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "referral_code_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_referral_code_deleted_at" ON "referral_code" ("deleted_at") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `alter table if exists "referral" add column if not exists "reward_sent_at" timestamptz null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "referral_code" cascade;`)

    this.addSql(`alter table if exists "referral" drop column if exists "reward_sent_at";`)
  }
}
