import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260517120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table if not exists "shipping_rate_history" (
      "id" text not null,
      "sampled_at" timestamptz not null,
      "sample_label" text not null,
      "weight_g" integer not null,
      "destination_postcode" text not null,
      "destination_state" text not null,
      "destination_country" text not null default 'AU',
      "carrier_results" jsonb not null,
      "cheapest_carrier_code" text null,
      "cheapest_amount_cents" integer null,
      "baseline_carrier_code" text null,
      "baseline_amount_cents" integer null,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      "deleted_at" timestamptz null,
      constraint "shipping_rate_history_pkey" primary key ("id")
    );`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_srh_sampled_at" ON "shipping_rate_history" ("sampled_at" DESC) WHERE deleted_at IS NULL;`)
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_srh_deleted_at" ON "shipping_rate_history" ("deleted_at") WHERE deleted_at IS NULL;`)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "shipping_rate_history" cascade;`)
  }
}
