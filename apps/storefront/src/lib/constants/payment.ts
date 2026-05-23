/**
 * Payment-related constants for the storefront.
 *
 * DEPRECATED: PAYID_ALIAS is kept here only as a final fallback for
 * components that haven't been ported to `getPayidAlias()` from
 * `@lib/data/site-config`. New code MUST use the SiteConfig fetcher.
 *
 * Resolution path (preferred): SiteConfig DB > NEXT_PUBLIC_PAYID_ALIAS env > registry default.
 * This module only provides the env / default tiers; the DB tier is fetched
 * via `getPublicConfig()` server-side.
 */

import { PUBLIC_SITE_CONFIG_DEFAULTS } from "@retail-example/shared-types"

/**
 * @deprecated Use `getPayidAlias()` from `@lib/data/site-config` (server-side).
 * For client components, accept the alias as a prop from a server parent.
 */
export const PAYID_ALIAS =
  process.env.NEXT_PUBLIC_PAYID_ALIAS || PUBLIC_SITE_CONFIG_DEFAULTS.payid_alias

/**
 * PayID auto-cancel window in hours.
 * Backend job `cancel-unpaid-payid-orders` cancels PayID orders unpaid
 * after this many hours. Cash-on-pickup orders are NOT auto-cancelled.
 *
 * NOTE: this value is for storefront copy only ("we'll hold for 24 hours").
 * The authoritative cancellation window is set by the backend SiteConfig key
 * `payid_hold_hours` (admin-editable).
 */
export const PAYID_HOLD_HOURS = 24
