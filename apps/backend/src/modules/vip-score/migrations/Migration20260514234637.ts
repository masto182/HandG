import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260514234637 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "vip_score" ("id" text not null, "customer_id" text not null, "personal_spend_12mo" real not null default 0, "network_spend_12mo" real not null default 0, "vip_score" real not null default 0, "order_count_12mo" integer not null default 0, "current_tier" text not null default 'approved', "tier_achieved_at" timestamptz null, "pending_demotion" boolean not null default false, "demotion_warning_at" timestamptz null, "last_evaluated_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "vip_score_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_vip_score_deleted_at" ON "vip_score" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "vip_score" cascade;`);
  }

}
