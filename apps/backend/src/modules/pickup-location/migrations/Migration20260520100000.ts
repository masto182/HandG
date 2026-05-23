import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260520100000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`ALTER TABLE "pickup_location" ADD COLUMN IF NOT EXISTS "stock_location_id" text NULL;`)
    this.addSql(`ALTER TABLE "pickup_location" DROP COLUMN IF EXISTS "name";`)
    this.addSql(`ALTER TABLE "pickup_location" DROP COLUMN IF EXISTS "address_line_1";`)
    this.addSql(`ALTER TABLE "pickup_location" DROP COLUMN IF EXISTS "address_line_2";`)
    this.addSql(`ALTER TABLE "pickup_location" DROP COLUMN IF EXISTS "city";`)
    this.addSql(`ALTER TABLE "pickup_location" DROP COLUMN IF EXISTS "state";`)
    this.addSql(`ALTER TABLE "pickup_location" DROP COLUMN IF EXISTS "postcode";`)
    this.addSql(`ALTER TABLE "pickup_location" DROP COLUMN IF EXISTS "country_code";`)
    this.addSql(`DELETE FROM "pickup_location" WHERE "stock_location_id" IS NULL;`)
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_pickup_location_stock_location_id" ON "pickup_location" ("stock_location_id") WHERE deleted_at IS NULL;`)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_pickup_location_stock_location_id";`)
    this.addSql(`ALTER TABLE "pickup_location" DROP COLUMN IF EXISTS "stock_location_id";`)
    this.addSql(`ALTER TABLE "pickup_location" ADD COLUMN "name" text NOT NULL DEFAULT '';`)
    this.addSql(`ALTER TABLE "pickup_location" ADD COLUMN "address_line_1" text NOT NULL DEFAULT '';`)
    this.addSql(`ALTER TABLE "pickup_location" ADD COLUMN "address_line_2" text NULL;`)
    this.addSql(`ALTER TABLE "pickup_location" ADD COLUMN "city" text NOT NULL DEFAULT '';`)
    this.addSql(`ALTER TABLE "pickup_location" ADD COLUMN "state" text NOT NULL DEFAULT '';`)
    this.addSql(`ALTER TABLE "pickup_location" ADD COLUMN "postcode" text NOT NULL DEFAULT '';`)
    this.addSql(`ALTER TABLE "pickup_location" ADD COLUMN "country_code" text NOT NULL DEFAULT 'AU';`)
  }

}
