import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260610024437 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "vip_score" add column if not exists "indirect_spend_12mo" real not null default 0;`
    )
    this.addSql(
      `alter table if exists "vip_score" rename column "network_spend_12mo" to "direct_spend_12mo";`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "vip_score" drop column if exists "indirect_spend_12mo";`)

    this.addSql(
      `alter table if exists "vip_score" rename column "direct_spend_12mo" to "network_spend_12mo";`
    )
  }
}
