import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260608_rename_notification_table extends Migration {
  async up(): Promise<void> {
    // Rename table and associated indexes to match new entity name inbox_notification
    this.addSql(`ALTER TABLE IF EXISTS "notification" RENAME TO "inbox_notification";`)
    this.addSql(`ALTER INDEX IF EXISTS "notification_pkey" RENAME TO "inbox_notification_pkey";`)
    this.addSql(
      `ALTER INDEX IF EXISTS "IDX_notification_deleted_at" RENAME TO "IDX_inbox_notification_deleted_at";`
    )
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE IF EXISTS "inbox_notification" RENAME TO "notification";`)
    this.addSql(`ALTER INDEX IF EXISTS "inbox_notification_pkey" RENAME TO "notification_pkey";`)
    this.addSql(
      `ALTER INDEX IF EXISTS "IDX_inbox_notification_deleted_at" RENAME TO "IDX_notification_deleted_at";`
    )
  }
}
