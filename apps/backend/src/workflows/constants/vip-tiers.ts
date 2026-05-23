// Backend re-exports of the shared VIP constants.
// The single source of truth lives in packages/shared-types/src/vip.ts.
// Kept as a thin wrapper so the many backend files that import from
// "../constants/vip-tiers" keep working without path changes.
export {
  VIP_TIER_THRESHOLDS,
  VIP_TIERS_ORDERED,
  VIP_ROLLING_WINDOW_MONTHS,
  VIP_DIRECT_MULTIPLIER,
  VIP_INDIRECT_MULTIPLIER,
  VIP_DEMOTION_GRACE_DAYS,
  getTierIndex,
  getHighestEligibleTier,
  type VipTier,
} from "@retail-example/shared-types"
