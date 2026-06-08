import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260531140000 extends Migration {
  override async up(): Promise<void> {
    // H4: idempotency flag for the referral reward email.
    this.addSql(
      `alter table if exists "referral" add column if not exists "reward_sent_at" timestamptz null;`
    )

    // Dedupe referral rows per referred_customer_id (keep most recent) BEFORE
    // adding the unique index.
    this.addSql(`
      UPDATE "referral" v
      SET "deleted_at" = now()
      WHERE "deleted_at" IS NULL
        AND EXISTS (
          SELECT 1 FROM "referral" w
          WHERE w."referred_customer_id" = v."referred_customer_id"
            AND w."deleted_at" IS NULL
            AND (w."updated_at" > v."updated_at"
                 OR (w."updated_at" = v."updated_at" AND w."id" > v."id"))
        );
    `)
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_referral_referred_customer_id" ON "referral" ("referred_customer_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_referral_referrer_customer_id" ON "referral" ("referrer_customer_id") WHERE deleted_at IS NULL;`
    )

    // H7: indexed referral-code lookup table.
    this.addSql(
      `create table if not exists "referral_code" ("id" text not null, "customer_id" text not null, "code" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "referral_code_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_referral_code_code" ON "referral_code" ("code") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_referral_code_customer_id" ON "referral_code" ("customer_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_referral_code_deleted_at" ON "referral_code" ("deleted_at") WHERE deleted_at IS NULL;`
    )

    // Backfill from existing customer.metadata.referral_code.
    this.addSql(`
      INSERT INTO "referral_code" ("id", "customer_id", "code", "created_at", "updated_at")
      SELECT 'refc_' || replace(gen_random_uuid()::text, '-', ''), c."id", c."metadata"->>'referral_code', now(), now()
      FROM "customer" c
      WHERE c."metadata"->>'referral_code' IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "referral_code" rc WHERE rc."customer_id" = c."id" AND rc."deleted_at" IS NULL
        )
      ON CONFLICT DO NOTHING;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "referral_code" cascade;`)
    this.addSql(`DROP INDEX IF EXISTS "IDX_referral_referrer_customer_id";`)
    this.addSql(`DROP INDEX IF EXISTS "UQ_referral_referred_customer_id";`)
    this.addSql(`alter table if exists "referral" drop column if exists "reward_sent_at";`)
  }
}
