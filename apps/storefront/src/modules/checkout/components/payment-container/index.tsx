import { Radio as RadioGroupOption } from "@headlessui/react"
import { Text, clx } from "@modules/common/components/ui"
import React, { type JSX } from "react"

import Radio from "@modules/common/components/radio"

type PaymentContainerProps = {
  paymentProviderId: string
  selectedPaymentOptionId: string | null
  disabled?: boolean
  paymentInfoMap: Record<string, { title: string; icon: JSX.Element }>
  children?: React.ReactNode
}

const PaymentContainer: React.FC<PaymentContainerProps> = ({
  paymentProviderId,
  selectedPaymentOptionId,
  paymentInfoMap,
  disabled = false,
  children,
}) => {
  const isSelected = selectedPaymentOptionId === paymentProviderId

  return (
    <RadioGroupOption
      key={paymentProviderId}
      value={paymentProviderId}
      disabled={disabled}
      className={clx(
        "flex flex-col gap-y-2 text-body-sm cursor-pointer py-4 px-6 border rounded-xl mb-2 transition-all",
        {
          "border-primary bg-primary/5": isSelected,
          "border-outline-variant hover:border-outline": !isSelected,
        }
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-x-4">
          <Radio checked={isSelected} />
          <Text className="text-body-md text-on-surface font-medium">
            {paymentInfoMap[paymentProviderId]?.title || paymentProviderId}
          </Text>
        </div>
        <span className="text-on-surface-variant">
          {paymentInfoMap[paymentProviderId]?.icon}
        </span>
      </div>
      {children}
    </RadioGroupOption>
  )
}

export default PaymentContainer
