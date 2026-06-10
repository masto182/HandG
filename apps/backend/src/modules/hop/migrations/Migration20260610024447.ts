import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260610024447 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "hop" add column if not exists "country_code" text null, add column if not exists "breeder" text null, add column if not exists "available_forms" jsonb null, add column if not exists "farm_notes" text null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "hop" drop column if exists "country_code", drop column if exists "breeder", drop column if exists "available_forms", drop column if exists "farm_notes";`
    )
  }
}
