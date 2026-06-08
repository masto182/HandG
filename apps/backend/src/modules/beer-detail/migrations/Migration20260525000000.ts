import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260525000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table if exists "beer_detail" drop column if exists "collab_brewery_ids";`)
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "beer_detail" add column if not exists "collab_brewery_ids" jsonb null;`
    )
  }
}
