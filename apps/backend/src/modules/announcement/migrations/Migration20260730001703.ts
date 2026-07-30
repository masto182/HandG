import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260730001703 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "announcement" add column if not exists "priority" integer not null default 0;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "announcement" drop column if exists "priority";`)
  }
}
