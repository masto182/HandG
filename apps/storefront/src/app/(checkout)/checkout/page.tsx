import {
  retrieveCart,
  applyApprovedOffersToCart,
  applyAutomaticPromotionsToCart,
} from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { listCartShippingMethods } from "@lib/data/fulfillment"
import { listCartPaymentMethods } from "@lib/data/payment"
import { getHeatHold } from "@lib/data/heat-hold"
import { getPickupLocations } from "@lib/data/pickup-locations"
import {
  getPayidHoldHours,
  getContactEmail,
  getPayidAlias,
} from "@lib/data/site-config"
import { getVariantAvailability } from "@lib/data/inventory"
import { getPickupOptions } from "@lib/util/shipping"
import { getUnavailableLineActions, getUnavailableLines } from "@lib/util/stock"
import UnavailableItemsAlert from "@modules/checkout/components/unavailable-items-alert"
import FixUnavailableButton from "@modules/checkout/components/fix-unavailable-button"
import PaymentWrapper from "@modules/checkout/components/payment-wrapper"
import CheckoutProgress from "@modules/checkout/components/checkout-progress"
import CheckoutSummary from "@modules/checkout/templates/checkout-summary"
import StepFulfilment from "@modules/checkout/components/step-fulfilment"
import StepAddress from "@modules/checkout/components/step-address"
import StepShipping from "@modules/checkout/components/step-shipping"
import StepPayment from "@modules/checkout/components/step-payment"
import StepReview from "@modules/checkout/components/step-review"
import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getEarlyAccessConfig } from "@lib/data/early-access"
import EarlyAccessCartGate from "@modules/cart/components/early-access-cart-gate"
import { toGateItems } from "@lib/util/early-access-cart"

export const metadata: Metadata = {
  title: "Checkout",
}

const VALID_STEPS = [
  "fulfilment",
  "address",
  "shipping",
  "payment",
  "review",
  "confirm",
]

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

  // Ensure any approved buy-at-price discount is applied (covers users who go
  // straight to checkout without visiting /cart). Best-effort; persisted on the
  // cart server-side so totals/order reflect it.
  await applyApprovedOffersToCart(cart)

  // Same gap, generic case: brewery BOGO deals and other non-customer-scoped
  // automatic promotions.
  await applyAutomaticPromotionsToCart(cart)

  const variantIds = (cart.items ?? [])
    .map((item) => item.variant_id)
    .filter(Boolean) as string[]
  const availability = await getVariantAvailability(variantIds).catch(
    () => null,
  )
  const unavailableLines = availability
    ? getUnavailableLines(cart.items ?? [], availability)
    : []
  const unavailableLineIds = unavailableLines.map((line) => line.id)
  const fixActions = availability
    ? getUnavailableLineActions(cart.items ?? [], availability)
    : []
  const linesLeftAfterFix =
    (cart.items?.length ?? 0) -
    fixActions.filter((action) => action.kind === "remove").length
  const canFixInPlace = fixActions.length > 0 && linesLeftAfterFix > 0
  const unavailableTitles = unavailableLines.map(
    (line) => line.product_title ?? line.title ?? "",
  )

  // customer + shipping methods are both always needed and independent — fetch
  const [customer, shippingMethods, earlyAccess] = await Promise.all([
    retrieveCustomer(),
    listCartShippingMethods(cart.id),
    getEarlyAccessConfig(),
  ])
  const pickupOptionsList = getPickupOptions(shippingMethods)
  const currentShippingOptionId =
    cart.shipping_methods?.at(-1)?.shipping_option_id
  const cartHasPickup = pickupOptionsList.some(
    (o) => o.id === currentShippingOptionId,
  )

  const step = params.step
  if (
    unavailableLineIds.length > 0 &&
    (step === "address" || step === "shipping" || step === "payment")
  ) {
    redirect("/checkout?step=fulfilment")
  }
  const isPickup =
    step === "fulfilment"
      ? false
      : step !== "address" && step !== "shipping" && cartHasPickup

  const renderStep = async () => {
    switch (step) {
      case "fulfilment":
        const pickupLocations = await getPickupLocations()
        return (
          <>
            <UnavailableItemsAlert titles={unavailableTitles}>
              {canFixInPlace ? (
                <FixUnavailableButton actions={fixActions} />
              ) : null}
            </UnavailableItemsAlert>
            <StepFulfilment
              cart={cart}
              shippingOptions={shippingMethods}
              pickupLocations={pickupLocations}
              blocked={unavailableLineIds.length > 0}
            />
          </>
        )
      case "address":
        if (isPickup) redirect("/checkout?step=payment")
        return <StepAddress cart={cart} customer={customer} />
      case "shipping":
        if (isPickup) redirect("/checkout?step=payment")
        if (!cart.shipping_address?.address_1)
          redirect("/checkout?step=address")
        return (
          <StepShipping
            cart={cart}
            shippingOptions={shippingMethods}
            contactEmail={await getContactEmail()}
          />
        )
      case "payment":
        if (
          !isPickup &&
          (!cart.shipping_methods || cart.shipping_methods.length === 0)
        ) {
          redirect("/checkout?step=fulfilment")
        }
        const paymentMethods = await listCartPaymentMethods(
          cart.region?.id ?? "",
        )
        const [payHoldHours, payOrdersEmail, payidAlias] = await Promise.all([
          getPayidHoldHours(),
          getContactEmail(),
          getPayidAlias(),
        ])
        return (
          <PaymentWrapper cart={cart}>
            <StepPayment
              cart={cart}
              paymentMethods={paymentMethods}
              isPickup={isPickup}
              holdHours={payHoldHours}
              ordersEmail={payOrdersEmail}
              payidAlias={payidAlias}
            />
          </PaymentWrapper>
        )
      case "review":
        if (
          !cart.payment_collection?.payment_sessions?.some(
            (s) => s.status === "pending",
          )
        ) {
          redirect("/checkout?step=payment")
        }
        const heatHold = await getHeatHold()
        return (
          <StepReview
            cart={cart}
            isPickup={isPickup}
            heatHold={heatHold}
            unavailableLineIds={unavailableLineIds}
            unavailableTitles={unavailableTitles}
          />
        )
      case "confirm":
        redirect("/checkout?step=review")
      default:
        return null
    }
  }

  const isConfirm = step === "confirm"

  return (
    <main className="min-h-screen flex max-w-[1440px] mx-auto px-4 sm:px-8">
      <EarlyAccessCartGate
        items={toGateItems(cart)}
        viewerTier={earlyAccess.viewerTier}
      />
      <section className={`flex-1 ${isConfirm ? "" : "lg:pr-[420px]"} py-12`}>
        <div className="max-w-[720px] mx-auto">
          {!isConfirm && (
            <CheckoutProgress currentStep={step} isPickup={isPickup} />
          )}
          {await renderStep()}
        </div>
      </section>
      {!isConfirm && (
        <aside
          className="hidden lg:flex fixed right-0 top-16 bottom-0 flex-col p-6 z-40 border-l border-hg-border/50 w-[400px] overflow-y-auto"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--color-surface) 60%, transparent)",
            backdropFilter: "blur(20px)",
          }}
        >
          <CheckoutSummary
            cart={cart}
            step={step}
            unavailableLineIds={unavailableLineIds}
          />
        </aside>
      )}
    </main>
  )
}
