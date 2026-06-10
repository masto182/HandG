import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260610030125 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "special_campaign" drop constraint if exists "special_campaign_slug_unique";`
    )
    this.addSql(
      `create table if not exists "aging_candidate" ("id" text not null, "product_id" text not null, "variant_id" text not null, "product_title" text null, "packaged_date" timestamptz not null, "days_aged" integer not null default 0, "status" text check ("status" in ('pending', 'approved', 'dismissed')) not null default 'pending', "campaign_id" text null, "dismissed_reason" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "aging_candidate_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_aging_candidate_deleted_at" ON "aging_candidate" ("deleted_at") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "special_campaign" ("id" text not null, "title" text not null, "slug" text not null, "type" text check ("type" in ('flash_sale', 'vip_exclusive', 'aging_markdown')) not null default 'flash_sale', "description" text null, "starts_at" timestamptz not null, "ends_at" timestamptz null, "target_customer_groups" jsonb null, "target_product_ids" jsonb null, "discount_type" text check ("discount_type" in ('percentage', 'fixed')) not null default 'percentage', "discount_value" integer not null default 0, "price_list_id" text null, "status" text check ("status" in ('draft', 'scheduled', 'active', 'expired')) not null default 'draft', "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "special_campaign_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_special_campaign_slug_unique" ON "special_campaign" ("slug") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_special_campaign_deleted_at" ON "special_campaign" ("deleted_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "aging_candidate" cascade;`)

    this.addSql(`drop table if exists "special_campaign" cascade;`)
  }
}
