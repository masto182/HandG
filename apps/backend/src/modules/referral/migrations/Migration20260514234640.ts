import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260514234640 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "referral" ("id" text not null, "referrer_customer_id" text not null, "referred_customer_id" text not null, "referral_code" text not null, "stealth_mode" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "referral_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_referral_deleted_at" ON "referral" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "referral" cascade;`);
  }

}
