// Backend re-exports of the shared early-access utilities.
// Single source of truth: packages/shared-types/src/early-access.ts.
export {
  HOURS_BEFORE_PUBLIC_BY_TIER,
  computeTierVisibleFrom,
  canCustomerAccessProduct,
  nextTierForEarlierAccess,
  currentLowestTierWithAccess,
  HOURS_AFTER_RELEASE_BY_TIER,
  RELEASE_TO_PUBLIC_HOURS,
  DEFAULT_RELEASE_DELAY_MINUTES,
  readProductRelease,
  tierUnlockAt,
  productAccessForTier,
  parseReleaseTime,
  resolveReleaseAt,
  releaseMetadata,
  type ProductAccess,
  type ProductRelease,
  type Tier,
} from "@retail-example/shared-types"
