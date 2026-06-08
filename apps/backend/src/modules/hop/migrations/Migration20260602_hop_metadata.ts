import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260602_hop_metadata extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table if exists "hop"
      add column if not exists "country_code" text null,
      add column if not exists "breeder" text null,
      add column if not exists "available_forms" jsonb null default '[]',
      add column if not exists "farm_notes" text null;`)
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_hop_country_code" ON "hop" ("country_code") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_hop_country_code";`)
    this.addSql(`alter table if exists "hop"
      drop column if exists "country_code",
      drop column if exists "breeder",
      drop column if exists "available_forms",
      drop column if exists "farm_notes";`)
  }
}
