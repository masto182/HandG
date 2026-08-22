import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260821180000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "new_drop_batch_recipient_item" add column if not exists "matched_brewery_names" jsonb null, add column if not exists "matched_hop_names" jsonb null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "new_drop_batch_recipient_item" drop column if exists "matched_brewery_names", drop column if exists "matched_hop_names";`
    )
  }
}
