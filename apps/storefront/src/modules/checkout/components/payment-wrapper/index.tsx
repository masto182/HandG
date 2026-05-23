"use client"

import React from "react"
import { HttpTypes } from "@medusajs/types"

type PaymentWrapperProps = {
  cart: HttpTypes.StoreCart
  children: React.ReactNode
}

// PayID and Cash-on-pickup are the only supported providers on this site.
// Neither requires a client-side SDK wrapper, so this wrapper is now a pass-through.
// Retained as a named component so callers (e.g. checkout layout) don't have to
// change if we ever need to reintroduce a provider that needs client-side context.
const PaymentWrapper: React.FC<PaymentWrapperProps> = ({ children }) => {
  return <div>{children}</div>
}

export default PaymentWrapper
