import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261024200000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "new_drop_batch" add column if not exists "intro_message" text null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "new_drop_batch" drop column if exists "intro_message";`)
  }
}
