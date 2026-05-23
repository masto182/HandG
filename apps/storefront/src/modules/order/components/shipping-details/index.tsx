import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { Heading, Text } from "@modules/common/components/ui"

import Divider from "@modules/common/components/divider"

type ShippingDetailsProps = {
  order: HttpTypes.StoreOrder
}

function isPickupOrder(order: HttpTypes.StoreOrder): boolean {
  const method = order.shipping_methods?.[0] as { name?: string } | undefined
  return /pickup/i.test(method?.name ?? "")
}

const ShippingDetails = ({ order }: ShippingDetailsProps) => {
  const pickup = isPickupOrder(order)
  const shippingMethod = order.shipping_methods?.[0] as { name?: string } | undefined

  return (
    <div>
      <Heading level="h2" className="flex flex-row text-3xl-regular my-6">
        {pickup ? "Pickup" : "Delivery"}
      </Heading>

      {pickup ? (
        <div className="flex items-start gap-x-8">
          <div className="flex flex-col w-1/2" data-testid="pickup-location-summary">
            <Text className="txt-medium-plus text-hg-text mb-1">
              Pickup Location
            </Text>
            <Text className="txt-medium text-hg-text-secondary">
              {shippingMethod?.name || "In-Store Pickup"}
            </Text>
          </div>

          <div className="flex flex-col w-1/2" data-testid="pickup-contact-summary">
            <Text className="txt-medium-plus text-hg-text mb-1">
              Arrange Pickup
            </Text>
            <Text className="txt-medium text-hg-text-secondary">
              Contact us to lock in a pickup time.
            </Text>
            <Text className="txt-medium text-hg-text-secondary">
              {order.email}
            </Text>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-x-8">
          <div
            className="flex flex-col w-1/3"
            data-testid="shipping-address-summary"
          >
            <Text className="txt-medium-plus text-hg-text mb-1">
              Shipping Address
            </Text>
            <Text className="txt-medium text-hg-text-secondary">
              {order.shipping_address?.first_name}{" "}
              {order.shipping_address?.last_name}
            </Text>
            <Text className="txt-medium text-hg-text-secondary">
              {order.shipping_address?.address_1}{" "}
              {order.shipping_address?.address_2}
            </Text>
            <Text className="txt-medium text-hg-text-secondary">
              {order.shipping_address?.postal_code},{" "}
              {order.shipping_address?.city}
            </Text>
            <Text className="txt-medium text-hg-text-secondary">
              {order.shipping_address?.country_code?.toUpperCase()}
            </Text>
          </div>

          <div
            className="flex flex-col w-1/3"
            data-testid="shipping-contact-summary"
          >
            <Text className="txt-medium-plus text-hg-text mb-1">Contact</Text>
            <Text className="txt-medium text-hg-text-secondary">
              {order.shipping_address?.phone}
            </Text>
            <Text className="txt-medium text-hg-text-secondary">{order.email}</Text>
          </div>

          <div
            className="flex flex-col w-1/3"
            data-testid="shipping-method-summary"
          >
            <Text className="txt-medium-plus text-hg-text mb-1">Method</Text>
            <Text className="txt-medium text-hg-text-secondary">
              {shippingMethod?.name} (
              {convertToLocale({
                amount: order.shipping_methods?.[0].total ?? 0,
                currency_code: order.currency_code,
              })}
              )
            </Text>
          </div>
        </div>
      )}

      <Divider className="mt-8" />
    </div>
  )
}

export default ShippingDetails
