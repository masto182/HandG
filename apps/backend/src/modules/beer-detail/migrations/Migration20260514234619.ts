import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260514234619 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "beer_detail" ("id" text not null, "product_id" text not null, "untappd_rating" real null, "untappd_bid" text null, "hg_stats" jsonb null, "hop_provenance" text null, "enrichment_status" text null, "collab_brewery_ids" jsonb null, "batch_group_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "beer_detail_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_beer_detail_deleted_at" ON "beer_detail" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "beer_detail" cascade;`);
  }

}
