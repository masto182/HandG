import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260608_rename_notification_table extends Migration {
  async up(): Promise<void> {
    // Only rename if the old notification table exists and inbox_notification
    // does not — fresh installs create inbox_notification directly in the
    // initial migration, so this block is a safe no-op for them.
    this.addSql(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'notification'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'inbox_notification'
        ) THEN
          ALTER TABLE "notification" RENAME TO "inbox_notification";
          ALTER INDEX IF EXISTS "notification_pkey" RENAME TO "inbox_notification_pkey";
          ALTER INDEX IF EXISTS "IDX_notification_deleted_at" RENAME TO "IDX_inbox_notification_deleted_at";
        END IF;
      END $$;
    `)
  }

  async down(): Promise<void> {
    this.addSql(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'inbox_notification'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'notification'
        ) THEN
          ALTER TABLE "inbox_notification" RENAME TO "notification";
          ALTER INDEX IF EXISTS "inbox_notification_pkey" RENAME TO "notification_pkey";
          ALTER INDEX IF EXISTS "IDX_inbox_notification_deleted_at" RENAME TO "IDX_notification_deleted_at";
        END IF;
      END $$;
    `)
  }
}
