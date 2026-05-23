import { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { CAMPAIGN_MODULE } from "../modules/campaign"

const AGING_THRESHOLD_DAYS = 60

export default async function agingScanner(container: MedusaContainer) {
  const campaignService = container.resolve(CAMPAIGN_MODULE) as any
  const productModule = container.resolve(Modules.PRODUCT) as any
  const logger = container.resolve("logger") as any

  logger.info("[Aging Scanner] Scanning for products past 60-day threshold...")

  const allProducts = await productModule.listProducts({}, { take: 1000, relations: ["variants"] })
  const now = Date.now()
  let flagged = 0

  for (const product of allProducts) {
    const meta = product.metadata as any
    if (!meta?.packaged_date) continue

    const packagedDate = new Date(meta.packaged_date)
    if (isNaN(packagedDate.getTime())) continue

    const daysAged = Math.floor((now - packagedDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysAged < AGING_THRESHOLD_DAYS) continue

    const existingCandidates = await campaignService.listAgingCandidates({
      product_id: product.id,
    })
    if (existingCandidates?.length) continue

    const primaryVariant = product.variants?.[0]
    if (!primaryVariant) continue

    await campaignService.createAgingCandidates({
      product_id: product.id,
      variant_id: primaryVariant.id,
      product_title: product.title,
      packaged_date: packagedDate,
      days_aged: daysAged,
      status: "pending",
    })
    flagged++
  }

  logger.info(`[Aging Scanner] Flagged ${flagged} new aging candidates. Done.`)
}

export const config = {
  name: "aging-scanner",
  schedule: "0 20 * * *",
}
