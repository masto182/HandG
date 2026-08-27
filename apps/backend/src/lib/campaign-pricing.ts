/**
 * Pure discount math shared by the campaign price-list build
 * (activateCampaignStep in manage-campaign.ts) and the specials batch
 * snapshot (send-specials-batch.ts) - kept here so it's independently unit
 * testable without a container/query.graph dependency.
 */
export function computeDiscountedPrice(
  basePrice: number,
  discountType: "percentage" | "fixed",
  discountValue: number
): number {
  if (discountType === "percentage") {
    return Math.round(basePrice * (1 - discountValue / 100))
  }
  return Math.max(0, Math.round(basePrice - discountValue * 100))
}
