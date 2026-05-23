import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260514234925 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "notification" ("id" text not null, "customer_id" text not null, "type" text not null, "title" text not null, "body" text not null, "read" boolean not null default false, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "notification_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_notification_deleted_at" ON "notification" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "notification" cascade;`);
  }

}
