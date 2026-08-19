/**
 * "Buy 4 Tree House beers, get 1 free" — a native Medusa BUYGET promotion.
 *
 * Note: this is deliberately a BOGO mechanic, not "20% off once you have
 * 4+". Medusa's buy_rules mechanism reserves buy_rules_min_quantity units
 * to satisfy the "buy" condition and subtracts that reservation from the
 * same pool before computing what's left to discount — so it can only
 * express "buy N, get M *additional* units off", never "discount the N
 * units themselves". Confirmed via source read of
 * @medusajs/promotion's buy-get.js and reproduced empirically in a cart.
 *
 * Targets product_type_id (NOT product_category_id — category is not
 * carried on cart line items in Medusa 2.17, so it can never match a
 * promotion rule; see lib/brewery-category.ts). Run
 * assign-brewery-product-types.ts first so the Tree House product type
 * exists.
 *
 * allocation="each" with apply_to_quantity=1/max_quantity=1 grants exactly
 * one free unit per "buy 4" cycle and repeats (buy 8 = 2 free, etc.) since
 * the promotion engine loops until no more qualifying items remain. The
 * free unit is whichever qualifying item wasn't consumed satisfying the
 * "buy" condition — since the engine reserves buy items highest-price-first,
 * this naturally tends to leave a lower-priced item as the free one.
 *
 * Usage:
 *   npx medusa exec ./src/scripts/create-tree-house-promo.ts            # dry run (default)
 *   DRY_RUN=false npx medusa exec ./src/scripts/create-tree-house-promo.ts  # commit
 */
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"

const PROMO_CODE = "TREEHOUSE_B4G1"
const BREWERY_TYPE_VALUE = "Tree House (brewery)"

export default async function createTreeHousePromo({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const promotionModule = container.resolve(Modules.PROMOTION) as any
  const productModule = container.resolve(Modules.PRODUCT) as any

  const dryRun = process.env.DRY_RUN !== "false"
  logger.info(`[TreeHousePromo] Starting (${dryRun ? "DRY RUN" : "COMMIT"})...`)

  const [type] = await productModule.listProductTypes({ value: BREWERY_TYPE_VALUE })
  if (!type) {
    logger.error(
      `Product type "${BREWERY_TYPE_VALUE}" not found — run assign-brewery-product-types.ts first`
    )
    return
  }

  const existing = await promotionModule.listPromotions({ code: PROMO_CODE })
  if (existing.length) {
    logger.info(`Promotion ${PROMO_CODE} already exists (id=${existing[0].id}) — skipping`)
    return
  }

  if (dryRun) {
    logger.info(
      `[dry run] Would create promotion ${PROMO_CODE}: buyget, buy 4 of type ${type.id}, get 1 free`
    )
    return
  }

  const promo = await promotionModule.createPromotions({
    code: PROMO_CODE,
    type: "buyget",
    status: "active",
    is_automatic: true,
    application_method: {
      type: "percentage",
      value: 100,
      target_type: "items",
      allocation: "each",
      apply_to_quantity: 1,
      max_quantity: 1,
      currency_code: "aud",
      target_rules: [{ attribute: "product_type_id", operator: "eq", values: [type.id] }],
      buy_rules: [{ attribute: "product_type_id", operator: "eq", values: [type.id] }],
      buy_rules_min_quantity: 4,
    },
  })

  logger.info(`Created promotion ${promo.id} (${PROMO_CODE}) on product type ${type.id}`)
}
