// Backend re-exports of the shared early-access utilities.
// Single source of truth: packages/shared-types/src/early-access.ts.
export {
  HOURS_BEFORE_PUBLIC_BY_TIER,
  computeTierVisibleFrom,
  canCustomerAccessProduct,
  nextTierForEarlierAccess,
  type Tier,
} from "@retail-example/shared-types"
