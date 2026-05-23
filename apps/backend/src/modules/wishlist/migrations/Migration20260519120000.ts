import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260519120000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`update "wishlist" set "mode" = 'buy_at_price' where "mode" = 'price_point';`);
  }

  override async down(): Promise<void> {
    this.addSql(`update "wishlist" set "mode" = 'price_point' where "mode" = 'buy_at_price';`);
  }

}
