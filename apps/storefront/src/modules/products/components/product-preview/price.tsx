import { Text, clx } from "@modules/common/components/ui"
import { VariantPrice } from "types/global"

export default async function PreviewPrice({ price }: { price: VariantPrice }) {
  if (!price) {
    return null
  }

  return (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
      {price.price_type === "sale" && (
        <Text
          className="line-through text-hg-text-secondary text-sm"
          data-testid="original-price"
        >
          {price.original_price}
        </Text>
      )}
      <Text
        className={clx("text-hg-text-secondary", {
          "text-hg-gold": price.price_type === "sale",
        })}
        data-testid="price"
      >
        {price.calculated_price}
      </Text>
    </span>
  )
}
