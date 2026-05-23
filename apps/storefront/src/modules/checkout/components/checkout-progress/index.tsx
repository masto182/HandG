"use client"

type Step = {
  label: string
  key: string
}

const DELIVERY_STEPS: Step[] = [
  { label: "Fulfilment Method", key: "fulfilment" },
  { label: "Shipping Address", key: "address" },
  { label: "Shipping Logistics", key: "shipping" },
  { label: "Payment Method", key: "payment" },
  { label: "Order Review", key: "review" },
  { label: "Confirmation", key: "confirm" },
]

const PICKUP_STEPS: Step[] = [
  { label: "Fulfilment Method", key: "fulfilment" },
  { label: "Payment Method", key: "payment" },
  { label: "Order Review", key: "review" },
  { label: "Confirmation", key: "confirm" },
]

type CheckoutProgressProps = {
  currentStep: string
  isPickup: boolean
}

const CheckoutProgress: React.FC<CheckoutProgressProps> = ({ currentStep, isPickup }) => {
  const steps = isPickup ? PICKUP_STEPS : DELIVERY_STEPS
  const currentIndex = steps.findIndex((s) => s.key === currentStep)
  const progress = ((currentIndex + 1) / steps.length) * 100

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-[11px] text-hg-gold uppercase tracking-[0.15em]">
          Step {String(currentIndex + 1).padStart(2, "0")} of {String(steps.length).padStart(2, "0")}
        </span>
        <span className="font-medium text-[11px] text-hg-text-secondary uppercase tracking-[0.1em]">
          {steps[currentIndex]?.label}
        </span>
      </div>
      <div className="h-[3px] w-full bg-hg-border/30 rounded-full overflow-hidden">
        <div
          className="h-full bg-hg-gold rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

export default CheckoutProgress
