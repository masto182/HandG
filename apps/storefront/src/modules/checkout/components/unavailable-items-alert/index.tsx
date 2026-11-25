import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { describeUnavailableItems } from "@lib/util/stock"

type Props = {
  titles: string[]
}

const UnavailableItemsAlert = ({ titles }: Props) => {
  if (titles.length === 0) return null

  return (
    <div
      role="alert"
      data-testid="unavailable-items-alert"
      className="mb-8 flex flex-col gap-3 rounded-xl border border-hl-error p-5"
    >
      <p className="font-semibold text-hl-error">
        {titles.length === 1
          ? "An item in your cart is sold out"
          : "Some items in your cart are sold out"}
      </p>
      <p className="text-sm text-hg-text-secondary">
        {describeUnavailableItems(titles)} Remove{" "}
        {titles.length === 1 ? "it" : "them"} from your cart to continue.
      </p>
      <LocalizedClientLink
        href="/cart"
        className="inline-flex min-h-[44px] w-fit items-center rounded-lg border border-hg-border px-5 text-sm font-semibold text-hg-text hover:border-hg-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-hg-gold transition-colors"
      >
        Back to cart
      </LocalizedClientLink>
    </div>
  )
}

export default UnavailableItemsAlert
