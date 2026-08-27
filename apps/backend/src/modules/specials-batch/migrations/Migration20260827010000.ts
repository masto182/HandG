import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260827010000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "specials_batch" add column if not exists "message" text null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "specials_batch" drop column if exists "message";`)
  }
}
