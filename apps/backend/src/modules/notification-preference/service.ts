import { MedusaService } from "@medusajs/framework/utils"
import NotificationPreference from "./models/notification-preference"
import {
  NOTIFICATION_CATEGORIES,
  isTransactional,
  isKnownCategory,
} from "./categories"
import type { NotificationCategory } from "../../lib/email"

export type PreferenceEntry = {
  category: NotificationCategory
  label: string
  description: string
  transactional: boolean
  enabled: boolean
}

export type SetPreferenceResult =
  | { updated: true; entry: PreferenceEntry }
  | { updated: false; noticeMessage: string }

class NotificationPreferenceModuleService extends MedusaService({
  NotificationPreference,
}) {
  /**
   * Returns true if the customer is opted-in for the category. Defaults to
   * `true` when no row exists. Transactional categories always return true.
   */
  async isOptedIn(
    customerId: string,
    category: NotificationCategory
  ): Promise<boolean> {
    if (isTransactional(category)) return true
    try {
      const rows = (await (this as any).listNotificationPreferences({
        customer_id: customerId,
        category,
      })) as Array<{ enabled: boolean }>
      if (rows.length === 0) return true
      return rows[0].enabled !== false
    } catch {
      return true
    }
  }

  /**
   * Returns one entry per known category, with `enabled` reflecting the
   * customer's stored preference (defaults to `true`).
   */
  async listForCustomer(customerId: string): Promise<PreferenceEntry[]> {
    const rows = (await (this as any).listNotificationPreferences({
      customer_id: customerId,
    })) as Array<{ category: string; enabled: boolean }>
    const byCategory = new Map(rows.map((r) => [r.category, r.enabled]))
    return NOTIFICATION_CATEGORIES.map((c) => ({
      category: c.category,
      label: c.label,
      description: c.description,
      transactional: c.transactional,
      enabled: byCategory.has(c.category)
        ? byCategory.get(c.category) !== false
        : true,
    }))
  }

  /**
   * Upsert a preference. Rejects attempts to disable transactional categories
   * with a `noticeMessage` (UI surfaces this in the toggle's helper text).
   */
  async setPreference(
    customerId: string,
    category: NotificationCategory,
    enabled: boolean
  ): Promise<SetPreferenceResult> {
    if (!isKnownCategory(category)) {
      return {
        updated: false,
        noticeMessage: `Unknown notification category: ${category}`,
      }
    }
    if (isTransactional(category) && enabled === false) {
      return {
        updated: false,
        noticeMessage:
          "This category is required for account & order notifications and cannot be disabled.",
      }
    }

    const existing = (await (this as any).listNotificationPreferences({
      customer_id: customerId,
      category,
    })) as Array<{ id: string }>

    if (existing.length > 0) {
      await (this as any).updateNotificationPreferences({
        selector: { id: existing[0].id },
        data: { enabled },
      })
    } else {
      await (this as any).createNotificationPreferences({
        customer_id: customerId,
        category,
        enabled,
      })
    }

    const def = NOTIFICATION_CATEGORIES.find((c) => c.category === category)!
    return {
      updated: true,
      entry: {
        category,
        label: def.label,
        description: def.description,
        transactional: def.transactional,
        enabled,
      },
    }
  }
}

export default NotificationPreferenceModuleService
