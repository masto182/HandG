"use client"

import { useSearchParams } from "next/navigation"

const STEPS = ["fulfilment", "address", "shipping", "payment", "review", "success"]

export default function CheckoutHeaderNav() {
  const searchParams = useSearchParams()
  const currentStep = searchParams.get("step") || "fulfilment"
  const activeStep = currentStep === "confirm" ? "success" : currentStep

  return (
    <nav className="hidden md:flex items-center gap-6">
      {STEPS.map((step) => {
        const isActive = step === activeStep
        return (
          <span
            key={step}
            className={`text-[11px] font-semibold tracking-[0.1em] uppercase pb-1 border-b-2 transition-colors ${
              isActive
                ? "text-hg-gold border-hg-gold"
                : "text-hg-text-secondary/60 border-transparent"
            }`}
          >
            {step === "success" ? "SUCCESS" : step.toUpperCase()}
          </span>
        )
      })}
    </nav>
  )
}
