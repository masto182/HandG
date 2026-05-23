import { Container, Heading, Text } from "@modules/common/components/ui"

import { isPayId, isManual, paymentInfoMap } from "@lib/constants"
import { PAYID_ALIAS } from "@lib/constants/payment"
import Divider from "@modules/common/components/divider"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type PaymentDetailsProps = {
  order: HttpTypes.StoreOrder
}

const PaymentDetails = ({ order }: PaymentDetailsProps) => {
  const payment = order.payment_collections?.[0].payments?.[0]
  const providerId = payment?.provider_id ?? ""
  const isPayid = isPayId(providerId)
  const isCash = isManual(providerId)

  const payidData = (payment?.data ?? {}) as {
    payid_alias?: string
    reference?: string
  }
  const payidEmail = payidData.payid_alias || PAYID_ALIAS
  const referenceCode =
    payidData.reference ||
    (order.id ? `HG-${order.id.replace(/[^A-Z0-9]/gi, "").slice(-8).toUpperCase()}` : "")

  return (
    <div>
      <Heading level="h2" className="flex flex-row text-3xl-regular my-6">
        Payment
      </Heading>
      <div>
        {payment && (
          <div>
            <div className="flex items-start gap-x-1 w-full mb-4">
              <div className="flex flex-col w-1/3">
                <Text className="txt-medium-plus text-hg-text mb-1">
                  Payment method
                </Text>
                <Text
                  className="txt-medium text-hg-text-secondary"
                  data-testid="payment-method"
                >
                  {paymentInfoMap[providerId]?.title ?? providerId}
                </Text>
              </div>
              <div className="flex flex-col w-2/3">
                <Text className="txt-medium-plus text-hg-text mb-1">
                  Amount
                </Text>
                <Text className="txt-medium text-hg-text-secondary" data-testid="payment-amount">
                  {convertToLocale({
                    amount: payment.amount,
                    currency_code: order.currency_code,
                  })}
                </Text>
              </div>
            </div>

            {isPayid && (
              <div className="rounded-lg border border-hg-border bg-hg-bg p-5 space-y-3">
                <Text className="txt-medium-plus text-hg-text">PayID Details</Text>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Text className="txt-medium text-hg-text-secondary">PayID</Text>
                    <Text className="txt-medium text-hg-text">{payidEmail}</Text>
                  </div>
                  <div className="flex justify-between">
                    <Text className="txt-medium text-hg-text-secondary">Reference</Text>
                    <Text className="txt-medium text-hg-text">{referenceCode}</Text>
                  </div>
                </div>
                <div className="pt-3 border-t border-hg-border">
                  <Text className="txt-small text-hg-text-secondary">
                    Payment must be made within 24 hours. Your items are held during this time. If payment is received after 24 hours, items may still be allocated but could be out of stock.
                  </Text>
                </div>
              </div>
            )}

            {isCash && (
              <div className="rounded-lg border border-hg-border bg-hg-bg p-5">
                <Text className="txt-medium text-hg-text-secondary">
                  Pay with cash when you collect your order. Payment is due at pickup.
                </Text>
              </div>
            )}
          </div>
        )}
      </div>

      <Divider className="mt-8" />
    </div>
  )
}

export default PaymentDetails
