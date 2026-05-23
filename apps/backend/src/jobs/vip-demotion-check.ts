import { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import evaluateVipDemotionWorkflow from "../workflows/evaluate-vip-demotion"
import { VIP_SCORE_MODULE } from "../modules/vip-score"
import {
  sendTemplate,
  refreshEmailConfig,
  getStoreUrl,
} from "../lib/email"
import * as VipDemotionWarningTpl from "../emails/vip-demotion-warning"

type Logger = {
  info: (msg: string) => void
  error: (msg: string) => void
}

export default async function vipDemotionCheck(container: MedusaContainer) {
  const vipScoreService = container.resolve(VIP_SCORE_MODULE) as any
  const customerModule = container.resolve(Modules.CUSTOMER)
  const logger = container.resolve("logger") as Logger

  logger.info("[VIP Demotion] Starting daily check...")
  await refreshEmailConfig(container)
  const storeUrl = getStoreUrl()

  const allScores = (await vipScoreService.listVipScores({})) as Array<{
    customer_id: string
    current_tier: string
  }>

  const atRisk = allScores.filter(
    (s) => s.current_tier !== "approved" && s.current_tier !== "pending"
  )

  const tallies = { demoted: 0, warning_issued: 0, warning_cleared: 0, retained: 0, noop: 0 }
  const workflow = evaluateVipDemotionWorkflow(container)

  for (const score of atRisk) {
    try {
      const { result } = await workflow.run({
        input: { customer_id: score.customer_id },
      })
      const action = (result as any)?.action as keyof typeof tallies | undefined
      if (action && action in tallies) tallies[action] += 1

      // Inline VIP demotion-warning email — fire ONLY on the day a fresh warning is stamped.
      if (
        action === "warning_issued" &&
        (result as any)?.is_new_warning === true
      ) {
        try {
          const [customer] = await customerModule.listCustomers({
            id: score.customer_id,
          })
          if (customer?.email) {
            const sendResult = await sendTemplate({
              to: customer.email,
              customerId: customer.id,
              category: "vip_progression",
              template: VipDemotionWarningTpl,
              props: {
                name: customer.first_name || "Collector",
                currentTier: score.current_tier,
                daysRemaining: (result as any).days_remaining ?? 0,
                storeUrl,
              },
              container,
            })
            logger.info(
              `[VIP Demotion] warning email → ${customer.email}: ${JSON.stringify(sendResult)}`
            )
          }
        } catch (emailErr) {
          logger.error(
            `[VIP Demotion] warning email failed for ${score.customer_id}: ${emailErr instanceof Error ? emailErr.message : String(emailErr)}`
          )
        }
      }
    } catch (err) {
      logger.error(
        `[VIP Demotion] Workflow failed for ${score.customer_id}: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  logger.info(
    `[VIP Demotion] Complete: ${tallies.warning_issued} warnings, ${tallies.demoted} demotions, ${tallies.warning_cleared} cleared, ${tallies.retained} retained, out of ${atRisk.length} members`
  )
}

export const config = {
  name: "vip-demotion-check",
  schedule: "0 16 * * *",
}
