import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260516120300 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "vip_score" add column if not exists "direct_spend_12mo" real not null default 0;`);
    this.addSql(`alter table "vip_score" add column if not exists "indirect_spend_12mo" real not null default 0;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "vip_score" drop column if exists "direct_spend_12mo";`);
    this.addSql(`alter table "vip_score" drop column if exists "indirect_spend_12mo";`);
  }

}
