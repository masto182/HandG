import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { listCartShippingMethods } from "@lib/data/fulfillment"
import { listCartPaymentMethods } from "@lib/data/payment"
import { getHeatHold } from "@lib/data/heat-hold"
import { getPickupOptions } from "@lib/util/shipping"
import PaymentWrapper from "@modules/checkout/components/payment-wrapper"
import CheckoutProgress from "@modules/checkout/components/checkout-progress"
import CheckoutSummary from "@modules/checkout/templates/checkout-summary"
import StepFulfilment from "@modules/checkout/components/step-fulfilment"
import StepAddress from "@modules/checkout/components/step-address"
import StepShipping from "@modules/checkout/components/step-shipping"
import StepPayment from "@modules/checkout/components/step-payment"
import StepReview from "@modules/checkout/components/step-review"
import StepConfirm from "@modules/checkout/components/step-confirm"
import { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Checkout",
}

const VALID_STEPS = ["fulfilment", "address", "shipping", "payment", "review", "confirm"]

export default async function Checkout({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>
}) {
  const params = await searchParams
  if (!params.step || !VALID_STEPS.includes(params.step)) {
    redirect("/checkout?step=fulfilment")
  }

  const cart = await retrieveCart()
  if (!cart || !cart.items?.length) {
    redirect("/cart")
  }

  const customer = await retrieveCustomer()
  const shippingMethods = await listCartShippingMethods(cart.id)
  const pickupOptionsList = getPickupOptions(shippingMethods)
  const currentShippingOptionId = cart.shipping_methods?.at(-1)?.shipping_option_id
  const cartHasPickup = pickupOptionsList.some((o) => o.id === currentShippingOptionId)

  const step = params.step
  const isPickup = step === "fulfilment" ? false : (step !== "address" && step !== "shipping" && cartHasPickup)

  const renderStep = async () => {
    switch (step) {
      case "fulfilment":
        return <StepFulfilment cart={cart} shippingOptions={shippingMethods} />
      case "address":
        if (isPickup) redirect("/checkout?step=payment")
        return <StepAddress cart={cart} customer={customer} />
      case "shipping":
        if (isPickup) redirect("/checkout?step=payment")
        if (!cart.shipping_address?.address_1) redirect("/checkout?step=address")
        return <StepShipping cart={cart} shippingOptions={shippingMethods} />
      case "payment":
        if (!isPickup && (!cart.shipping_methods || cart.shipping_methods.length === 0)) {
          redirect("/checkout?step=fulfilment")
        }
        const paymentMethods = await listCartPaymentMethods(cart.region?.id ?? "")
        return (
          <PaymentWrapper cart={cart}>
            <StepPayment cart={cart} paymentMethods={paymentMethods} isPickup={isPickup} />
          </PaymentWrapper>
        )
      case "review":
        if (!cart.payment_collection?.payment_sessions?.some((s) => s.status === "pending")) {
          redirect("/checkout?step=payment")
        }
        const heatHold = await getHeatHold()
        return <StepReview cart={cart} isPickup={isPickup} heatHold={heatHold} />
      case "confirm":
        return <StepConfirm cart={cart} />
      default:
        return null
    }
  }

  const isConfirm = step === "confirm"

  return (
    <main className="min-h-screen flex max-w-[1440px] mx-auto px-8">
      <section className={`flex-1 ${isConfirm ? "" : "lg:pr-[420px]"} py-12`}>
        <div className="max-w-[720px] mx-auto">
          {!isConfirm && <CheckoutProgress currentStep={step} isPickup={isPickup} />}
          {await renderStep()}
        </div>
      </section>
      {!isConfirm && (
        <aside className="hidden lg:flex fixed right-0 top-16 bottom-0 flex-col p-6 z-40 border-l border-hg-border/50 w-[400px] overflow-y-auto" style={{ backgroundColor: "color-mix(in srgb, var(--color-surface) 60%, transparent)", backdropFilter: "blur(20px)" }}>
          <CheckoutSummary cart={cart} step={step} />
        </aside>
      )}
    </main>
  )
}
