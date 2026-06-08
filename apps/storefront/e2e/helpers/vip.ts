import { Page } from "@playwright/test"
import { readVipScoreFromAccount } from "./customer-ui"

/**
 * Poll the customer's VIP score until it crosses `target` or `timeoutMs`.
 *
 * VIP score updates run asynchronously via subscriber → workflow once
 * `order.payment_captured` fires. The 3-second poll interval matches what we
 * observe in dev. Returns the final score (which may still be below target
 * if the timeout hits — caller asserts).
 */
export async function pollVipScore(
  page: Page,
  target: number,
  timeoutMs = 60_000,
): Promise<number> {
  const deadline = Date.now() + timeoutMs
  let last = NaN
  while (Date.now() < deadline) {
    last = await readVipScoreFromAccount(page)
    if (Number.isFinite(last) && last >= target) return last
    await page.waitForTimeout(3_000)
  }
  return last
}
