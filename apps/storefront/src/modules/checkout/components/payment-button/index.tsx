"use client"

import { isManual, isPayId } from "@lib/constants"
import { placeOrder } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@modules/common/components/ui"
import React, { useState } from "react"
import ErrorMessage from "../error-message"

type PaymentButtonProps = {
  cart: HttpTypes.StoreCart
  "data-testid": string
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  cart,
  "data-testid": dataTestId,
}) => {
  const notReady =
    !cart ||
    !cart.shipping_address ||
    !cart.billing_address ||
    !cart.email ||
    (cart.shipping_methods?.length ?? 0) < 1

  const paymentSession = cart.payment_collection?.payment_sessions?.[0]
  const providerId = paymentSession?.provider_id

  if (isPayId(providerId) || isManual(providerId)) {
    return (
      <PlaceOrderButton
        notReady={notReady}
        data-testid={dataTestId}
        providerKind={isPayId(providerId) ? "payid" : "manual"}
      />
    )
  }

  return <Button disabled>Select a payment method</Button>
}

const PlaceOrderButton = ({
  notReady,
  "data-testid": dataTestId,
  providerKind,
}: {
  notReady: boolean
  "data-testid": string
  providerKind: "payid" | "manual"
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const label = providerKind === "payid" ? "I Have Made the Payment" : "Place Order"

  const handlePayment = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      await placeOrder()
    } catch (err: any) {
      setErrorMessage(err?.message || "Something went wrong placing your order.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Button
        disabled={notReady}
        isLoading={submitting}
        onClick={handlePayment}
        size="large"
        data-testid={dataTestId}
      >
        {label}
      </Button>
      <ErrorMessage
        error={errorMessage}
        data-testid={`${providerKind}-payment-error-message`}
      />
    </>
  )
}

export default PaymentButton
