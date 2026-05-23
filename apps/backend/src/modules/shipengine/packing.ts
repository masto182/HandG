/**
 * Re-export shim - packing logic moved to apps/backend/src/modules/shipping-common/packing.ts
 * so it can be reused by the auspost fulfillment provider.
 *
 * Existing imports from "./modules/shipengine/packing" continue to work.
 */
export * from "../shipping-common/packing"
