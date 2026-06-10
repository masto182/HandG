import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260610024434 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "restock_alert" add column if not exists "restock_detected_at" timestamptz null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "restock_alert" drop column if exists "restock_detected_at";`
    )
  }
}
