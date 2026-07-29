import { INBOX_MODULE } from "../modules/inbox"

export async function createInboxNotification(
  container: any,
  customerId: string,
  type: string,
  title: string,
  body: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const notificationService = container.resolve(INBOX_MODULE) as any
    await notificationService.createNotifications({
      customer_id: customerId,
      type,
      title,
      body,
      metadata: metadata ?? null,
    })
  } catch (err) {
    // Non-critical — log but don't propagate
    try {
      const logger = container.resolve("logger")
      logger.warn(`[Inbox] Failed to create notification for ${customerId}: ${err}`)
    } catch {}
  }
}
