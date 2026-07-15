import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { RESTOCK_ALERT_MODULE } from "../modules/restock-alert"
import { VIP_SCORE_MODULE } from "../modules/vip-score"

type CreateRestockAlertInput = {
  customer_id: string
  product_id?: string | null
  beer_name: string
  brewery_name: string
}

type DeleteRestockAlertInput = {
  id: string
  customer_id: string
}

const createRestockAlertStep = createStep(
  "create-restock-alert",
  async (input: CreateRestockAlertInput, { container }) => {
    const restockAlertService = container.resolve(RESTOCK_ALERT_MODULE) as any

    // Dedupe against pending (not-yet-notified) alerts. Prefer product_id when
    // present; otherwise fall back to (beer_name, brewery_name) for ad-hoc
    // subscriptions to products not in our catalog.
    // Note: filtering by notified_at: null in the DB query is avoided because
    // MikroORM 6.6+ may generate IS NULL incorrectly for nullable dateTime
    // columns in some contexts. We filter in JS instead.
    const dedupeFilter: Record<string, unknown> = {
      customer_id: input.customer_id,
    }
    if (input.product_id) {
      dedupeFilter.product_id = input.product_id
    } else {
      dedupeFilter.beer_name = input.beer_name
      dedupeFilter.brewery_name = input.brewery_name
    }

    const allMatches = await restockAlertService.listRestockAlerts(
      dedupeFilter,
      // Explicit select: Medusa 2.17 / MikroORM 6.6 can return only "id" by
      // default in workflow-step context. We need notified_at for the JS filter.
      {
        select: [
          "id",
          "customer_id",
          "product_id",
          "beer_name",
          "brewery_name",
          "notified_at",
          "tier_at_notification",
        ],
      }
    )
    const existing = allMatches.filter((a: any) => !a.notified_at)
    if (existing.length) {
      // Nothing created -> no compensation payload.
      return new StepResponse({ alert: existing[0], created: false }, null)
    }

    // Capture the customer's current VIP tier so the dispatcher can honour the
    // tiered early-access ladder (vip5 first ... approved last).
    let tier = "approved"
    try {
      const vipScoreService = container.resolve(VIP_SCORE_MODULE) as any
      const scores = await vipScoreService.listVipScores({
        customer_id: input.customer_id,
      })
      if (scores.length && scores[0].current_tier) {
        tier = scores[0].current_tier
      }
    } catch {
      // VIP score is optional; default to "approved".
    }

    const created = await restockAlertService.createRestockAlerts({
      customer_id: input.customer_id,
      product_id: input.product_id ?? null,
      beer_name: input.beer_name,
      brewery_name: input.brewery_name,
      tier_at_notification: tier,
    })
    const alert = Array.isArray(created) ? created[0] : created

    return new StepResponse({ alert, created: true }, { id: alert.id })
  },
  // TS 6: stricter generic variance on CompensateFn — use any to satisfy
  async (compensation: { id: string } | null | any, { container }) => {
    if (!compensation?.id) return
    const restockAlertService = container.resolve(RESTOCK_ALERT_MODULE) as any
    await restockAlertService.deleteRestockAlerts(compensation.id)
  }
)

const deleteRestockAlertStep = createStep(
  "delete-restock-alert",
  async (input: DeleteRestockAlertInput, { container }) => {
    const restockAlertService = container.resolve(RESTOCK_ALERT_MODULE) as any

    // Ownership + existence check lives in the step (not the route).
    const [alert] = await restockAlertService.listRestockAlerts({
      id: input.id,
      customer_id: input.customer_id,
    })
    if (!alert) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Restock alert not found")
    }

    await restockAlertService.deleteRestockAlerts(input.id)
    return new StepResponse({ deleted: true, id: input.id }, alert)
  },
  async (alert: any, { container }) => {
    if (!alert) return
    const restockAlertService = container.resolve(RESTOCK_ALERT_MODULE) as any
    // Restore with the real model fields (incl. NOT-NULL beer_name/brewery_name).
    await restockAlertService.createRestockAlerts({
      customer_id: alert.customer_id,
      product_id: alert.product_id ?? null,
      beer_name: alert.beer_name,
      brewery_name: alert.brewery_name,
      tier_at_notification: alert.tier_at_notification ?? null,
      notified_at: alert.notified_at ?? null,
      restock_detected_at: alert.restock_detected_at ?? null,
    })
  }
)

export const createRestockAlertWorkflow = createWorkflow(
  "create-restock-alert",
  function (input: CreateRestockAlertInput) {
    const result = (createRestockAlertStep as any)(input)
    return new WorkflowResponse(result)
  }
)

export const deleteRestockAlertWorkflow = createWorkflow(
  "delete-restock-alert",
  function (input: DeleteRestockAlertInput) {
    const result = (deleteRestockAlertStep as any)(input)
    return new WorkflowResponse(result)
  }
)
