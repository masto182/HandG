import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260531130000 extends Migration {
  override async up(): Promise<void> {
    // Collapse any pre-existing duplicate vip_score rows per customer BEFORE
    // adding the unique index (the absence of this constraint is what allowed
    // the duplicates). Keep the most-recently-updated row; soft-delete the rest.
    this.addSql(`
      UPDATE "vip_score" v
      SET "deleted_at" = now()
      WHERE "deleted_at" IS NULL
        AND EXISTS (
          SELECT 1 FROM "vip_score" w
          WHERE w."customer_id" = v."customer_id"
            AND w."deleted_at" IS NULL
            AND (w."updated_at" > v."updated_at"
                 OR (w."updated_at" = v."updated_at" AND w."id" > v."id"))
        );
    `)
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_vip_score_customer_id" ON "vip_score" ("customer_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "UQ_vip_score_customer_id";`)
  }
}
