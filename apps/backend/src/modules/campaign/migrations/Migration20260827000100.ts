import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260827000100 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "special_campaign" add column if not exists "batch_id" text null;`
    )
    this.addSql(
      `alter table if exists "special_campaign" add column if not exists "batched_at" timestamptz null;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_special_campaign_batch_id" ON "special_campaign" ("batch_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "special_campaign" drop column if exists "batch_id";`)
    this.addSql(`alter table if exists "special_campaign" drop column if exists "batched_at";`)
  }
}
