import { clx } from "@modules/common/components/ui"
import { HttpTypes } from "@medusajs/types"

type LineItemOptionsProps = {
  variant: HttpTypes.StoreProductVariant | undefined | null
  "data-testid"?: string
  "data-value"?: HttpTypes.StoreProductVariant | undefined | null
  className?: string
}

const LineItemOptions = ({
  variant,
  "data-testid": dataTestid,
  "data-value": _dataValue,
  className,
}: LineItemOptionsProps) => {
  const optionValues = variant?.options
    ?.map((o: any) => o.value)
    .filter(Boolean)
    .join(" · ")

  if (!optionValues) return null

  return (
    <span
      className={clx("text-body-sm text-on-surface-variant", className)}
      data-testid={dataTestid}
    >
      {optionValues}
    </span>
  )
}

export default LineItemOptions
