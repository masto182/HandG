"use client"
import { RadioGroup } from "@headlessui/react"
import { paymentInfoMap } from "@lib/constants"
import { isPayId, isManual } from "@lib/constants"
import { initiatePaymentSession } from "@lib/data/cart"
import { CheckCircleSolid, CreditCard } from "@medusajs/icons"
import PayIdInfo from "@modules/checkout/components/payid-info"
import ErrorMessage from "@modules/checkout/components/error-message"
import PaymentContainer from "@modules/checkout/components/payment-container"
import {
  Button,
  Container,
  Heading,
  Text,
  clx,
} from "@modules/common/components/ui"
import { HttpTypes } from "@medusajs/types"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

const Payment = ({
  cart,
  availablePaymentMethods,
  isPickup = false,
}: {
  cart: HttpTypes.StoreCart
  availablePaymentMethods: { id: string }[]
  isPickup?: boolean
}) => {
  const activeSession = cart.payment_collection?.payment_sessions?.find(
    (paymentSession) => paymentSession.status === "pending"
  )

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    activeSession?.provider_id ?? ""
  )

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "payment"

  const setPaymentMethod = async (method: string) => {
    setError(null)
    setSelectedPaymentMethod(method)
  }

  const paidByGiftcard = !!(
    (cart as unknown as Record<string, unknown>)?.gift_cards && ((cart as unknown as Record<string, unknown>)?.gift_cards as unknown[])?.length > 0 && cart?.total === 0
  )

  const paymentReady =
    (activeSession && (cart?.shipping_methods?.length ?? 0) !== 0) || paidByGiftcard

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams)
      params.set(name, value)

      return params.toString()
    },
    [searchParams]
  )

  const handleEdit = () => {
    router.push(pathname + "?" + createQueryString("step", "payment"), {
      scroll: false,
    })
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      const actualProviderId = selectedPaymentMethod
      const checkActiveSession =
        activeSession?.provider_id === actualProviderId

      if (!checkActiveSession) {
        await initiatePaymentSession(cart, {
          provider_id: actualProviderId,
        })
      }

      return router.push(
        pathname + "?" + createQueryString("step", "review"),
        { scroll: false }
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setError(null)
  }, [isOpen])

  return (
    <div>
      <div className="flex flex-row items-center justify-between mb-6">
        <Heading
          level="h2"
          className={clx(
            "text-xl font-semibold text-hg-text flex items-center gap-x-2",
            {
              "opacity-50 pointer-events-none select-none":
                !isOpen && !paymentReady,
            }
          )}
        >
          Payment
          {!isOpen && paymentReady && <CheckCircleSolid className="text-hg-gold w-5 h-5" />}
        </Heading>
        {!isOpen && paymentReady && (
          <button
            onClick={handleEdit}
            className="text-sm text-hg-gold hover:text-hg-gold-hover"
            data-testid="edit-payment-button"
          >
            Edit
          </button>
        )}
      </div>
      <div>
        <div className={isOpen ? "block" : "hidden"}>
          {!paidByGiftcard && availablePaymentMethods?.length && (
            <>
              <RadioGroup
                value={selectedPaymentMethod}
                onChange={(value: string) => setPaymentMethod(value)}
              >
                {availablePaymentMethods
                  .filter((pm) => isPickup || !isManual(pm.id))
                  .map((paymentMethod) => (
                  <div key={paymentMethod.id}>
                    <PaymentContainer
                      paymentInfoMap={paymentInfoMap}
                      paymentProviderId={paymentMethod.id}
                      selectedPaymentOptionId={selectedPaymentMethod}
                    >
                      {isPayId(paymentMethod.id) &&
                        selectedPaymentMethod === paymentMethod.id && (
                          <PayIdInfo />
                        )}
                    </PaymentContainer>
                  </div>
                ))}

                {isPickup && isManual(selectedPaymentMethod) && (
                  <div className="py-3 px-4 rounded-lg bg-hg-bg border border-hg-border mt-3">
                    <Text className="text-sm text-hg-text-secondary">
                      Pay with cash or card when you collect your order.
                    </Text>
                  </div>
                )}
              </RadioGroup>
            </>
          )}

          {paidByGiftcard && (
            <div className="flex flex-col w-1/3">
              <Text className="txt-medium-plus text-hg-text mb-1">
                Payment method
              </Text>
              <Text
                className="txt-medium text-hg-text-secondary"
                data-testid="payment-method-summary"
              >
                Gift card
              </Text>
            </div>
          )}

          <ErrorMessage
            error={error}
            data-testid="payment-method-error-message"
          />

          <Button
            size="large"
            className="mt-6"
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={!selectedPaymentMethod && !paidByGiftcard}
            data-testid="submit-payment-button"
          >
            Continue to review
          </Button>
        </div>

        <div className={isOpen ? "hidden" : "block"}>
          {cart && paymentReady && activeSession ? (
            <div className="flex items-start gap-x-1 w-full">
              <div className="flex flex-col w-1/3">
                <Text className="txt-medium-plus text-hg-text mb-1">
                  Payment method
                </Text>
                <Text
                  className="txt-medium text-hg-text-secondary"
                  data-testid="payment-method-summary"
                >
                  {paymentInfoMap[activeSession?.provider_id]?.title ||
                    activeSession?.provider_id}
                </Text>
              </div>
              <div className="flex flex-col w-1/3">
                <Text className="txt-medium-plus text-hg-text mb-1">
                  Payment details
                </Text>
                <div
                  className="flex gap-2 txt-medium text-hg-text-secondary items-center"
                  data-testid="payment-details-summary"
                >
                  <Container className="flex items-center h-7 w-fit p-2 bg-hg-surface-hover">
                    {paymentInfoMap[selectedPaymentMethod]?.icon || (
                      <CreditCard />
                    )}
                  </Container>
                  <Text>
                    Another step will appear
                  </Text>
                </div>
              </div>
            </div>
          ) : paidByGiftcard ? (
            <div className="flex flex-col w-1/3">
              <Text className="txt-medium-plus text-hg-text mb-1">
                Payment method
              </Text>
              <Text
                className="txt-medium text-hg-text-secondary"
                data-testid="payment-method-summary"
              >
                Gift card
              </Text>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default Payment
