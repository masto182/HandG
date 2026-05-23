import { CreditCard } from "@medusajs/icons"
import React from "react"

/* Map of payment provider_id to title and icon.
 * This reference example registers PayID and Cash-on-pickup (manual) only.
 * Add additional providers here when you register them in medusa-config.ts. */
export const paymentInfoMap: Record<
  string,
  { title: string; icon: React.JSX.Element }
> = {
  pp_system_default: {
    title: "Cash on Pickup",
    icon: <CreditCard />,
  },
  pp_payid_payid: {
    title: "PayID",
    icon: <CreditCard />,
  },
}

export const isManual = (providerId?: string) => {
  return providerId?.startsWith("pp_system_default")
}
export const isPayId = (providerId?: string) => {
  return providerId?.startsWith("pp_payid")
}

// Add currencies that don't need to be divided by 100
export const noDivisionCurrencies = [
  "krw",
  "jpy",
  "vnd",
  "clp",
  "pyg",
  "xaf",
  "xof",
  "bif",
  "djf",
  "gnf",
  "kmf",
  "mga",
  "rwf",
  "xpf",
  "htg",
  "vuv",
  "xag",
  "xdr",
  "xau",
]
