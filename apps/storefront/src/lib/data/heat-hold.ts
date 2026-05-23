import "server-only"
import { cache } from "react"
import { getPublicConfig } from "./site-config"

/**
 * Returns the heat-hold flag + the customer-facing message from the
 * public site config (cached per request).
 */
export const getHeatHold = cache(async (): Promise<{ enabled: boolean; message: string }> => {
  try {
    const cfg = await getPublicConfig()
    return {
      enabled: Boolean(cfg.heat_hold_enabled),
      message: cfg.shipping_heat_hold_message,
    }
  } catch {
    return {
      enabled: false,
      message:
        "Forecast heat is high. Orders are queued and will dispatch on the next safe day.",
    }
  }
})
