import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260610030058 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "referral" ("id" text not null, "referrer_customer_id" text not null, "referred_customer_id" text not null, "referral_code" text not null, "stealth_mode" boolean not null default false, "reward_sent_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "referral_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_referral_deleted_at" ON "referral" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_referral_referred_customer_id" ON "referral" ("referred_customer_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_referral_referrer_customer_id" ON "referral" ("referrer_customer_id") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "referral_code" ("id" text not null, "customer_id" text not null, "code" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "referral_code_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_referral_code_deleted_at" ON "referral_code" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_referral_code_code" ON "referral_code" ("code") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_referral_code_customer_id" ON "referral_code" ("customer_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "referral" cascade;`)

    this.addSql(`drop table if exists "referral_code" cascade;`)
  }
}
