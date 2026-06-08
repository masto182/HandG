import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260608120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`ALTER TABLE "vip_score" DROP COLUMN IF EXISTS "network_spend_12mo";`)
  }

  override async down(): Promise<void> {
    this.addSql(
      `ALTER TABLE "vip_score" ADD COLUMN IF NOT EXISTS "network_spend_12mo" numeric NOT NULL DEFAULT 0;`
    )
  }
}
