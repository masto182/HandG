import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Corrects two design errors from the original (never-actually-used)
 * SpecialCampaign-backed design: "specials" in this store are real Medusa
 * "sale" price lists (created by the beer import/stock-update scripts), not
 * rows in special_campaign - and their amounts are plain AUD dollars, not
 * cents. specials_batch/_item never held real rows in any environment, so
 * this is a straight schema correction, not a data migration.
 */
export class Migration20260828000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "specials_batch" rename column "campaign_count" to "product_count";`
    )
    this.addSql(
      `alter table if exists "specials_batch_item" rename column "campaign_id" to "price_list_id";`
    )
    this.addSql(
      `alter table if exists "specials_batch_item" alter column "original_price" type numeric using "original_price"::numeric;`
    )
    this.addSql(
      `alter table if exists "specials_batch_item" alter column "discounted_price" type numeric using "discounted_price"::numeric;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "specials_batch_item" alter column "discounted_price" type integer using round("discounted_price")::integer;`
    )
    this.addSql(
      `alter table if exists "specials_batch_item" alter column "original_price" type integer using round("original_price")::integer;`
    )
    this.addSql(
      `alter table if exists "specials_batch_item" rename column "price_list_id" to "campaign_id";`
    )
    this.addSql(
      `alter table if exists "specials_batch" rename column "product_count" to "campaign_count";`
    )
  }
}
