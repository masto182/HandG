import repeat from "@lib/util/repeat"
import { HttpTypes } from "@medusajs/types"

import Item from "@modules/cart/components/item"
import SkeletonLineItem from "@modules/skeletons/components/skeleton-line-item"

type ItemsTemplateProps = {
  cart?: HttpTypes.StoreCart
  inventoryMap?: Record<string, number>
}

const ItemsTemplate = ({ cart, inventoryMap = {} }: ItemsTemplateProps) => {
  const items = cart?.items
  return (
    <div className="space-y-4">
      {items
        ? items
            .sort((a, b) => {
              return (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
            })
            .map((item) => {
              return (
                <Item
                  key={item.id}
                  item={item}
                  currencyCode={cart?.currency_code}
                  maxStock={item.variant_id ? inventoryMap[item.variant_id] : undefined}
                />
              )
            })
        : repeat(3).map((i) => {
            return <SkeletonLineItem key={i} />
          })}
    </div>
  )
}

export default ItemsTemplate
