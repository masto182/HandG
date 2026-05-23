import { HttpTypes } from "@medusajs/types"
import { convertToLocale } from "@lib/util/money"

const CheckoutSummary = ({ cart, step }: { cart: HttpTypes.StoreCart; step?: string }) => {
  const items = cart.items || []
  const currencyCode = cart.currency_code || "aud"

  const subtotal = cart.item_subtotal ?? 0
  const shippingTotal = cart.shipping_total ?? 0
  const discount = cart.discount_total ?? 0
  const total = cart.total ?? 0

  // Step-aware shipping label.
  const shippingRow: { text: string; isAmount: boolean } = (() => {
    const fmt = () => convertToLocale({ amount: shippingTotal, currency_code: currencyCode })
    switch (step) {
      case "fulfilment":
        return { text: "Calculated at selection", isAmount: false }
      case "address":
        return { text: "\u2014", isAmount: false }
      case "shipping":
      case "payment":
      case "review":
      case "confirm":
        return shippingTotal > 0
          ? { text: fmt(), isAmount: true }
          : { text: "\u2014", isAmount: false }
      default:
        return { text: "\u2014", isAmount: false }
    }
  })()

  return (
    <div className="flex flex-col h-full">
      <div className="mb-8">
        <h2 className="text-hg-gold font-bold text-xl uppercase tracking-tighter">Order Summary</h2>
        <p className="text-[11px] tracking-wide text-hg-text-secondary uppercase mt-1">Collector Tier Member</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6">
        <div className="space-y-0.5 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-3 py-2.5 bg-hg-gold/10 text-hg-gold border-r-2 border-hg-gold">
            <div className="flex items-center gap-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /></svg>
              <span className="text-[11px] tracking-wide uppercase font-semibold">Subtotal</span>
            </div>
            <span className="text-[11px] font-semibold">{convertToLocale({ amount: subtotal, currency_code: currencyCode })}</span>
          </div>
          <div className="flex items-center justify-between gap-3 px-3 py-2.5 text-hg-text-secondary/70">
            <div className="flex items-center gap-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="3" width="15" height="13" rx="2" /><path d="M16 8h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2" /><path d="M5 18v2" /><path d="M12 18v2" /></svg>
              <span className="text-[11px] tracking-wide uppercase">Shipping</span>
            </div>
            <span className={`text-[11px] ${shippingRow.isAmount ? "font-semibold" : "italic"}`}>
              {shippingRow.text}
            </span>
          </div>

        </div>

        {items.length > 0 && (
          <div className="pt-6 border-t border-hg-border space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-4">
                <div className="w-16 h-16 bg-hl-surface3 rounded overflow-hidden flex-shrink-0">
                  {item.thumbnail && (
                    <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {(() => {
                    const productMeta = (item as any).product?.metadata || (item as any).variant?.product?.metadata
                    const brewery = productMeta?.brewery_name || productMeta?.brewery || (item as any).product_collection || (item as any).product_subtitle
                    return brewery ? (
                      <p className="text-[10px] text-hg-text-secondary uppercase tracking-wider truncate">{brewery}</p>
                    ) : null
                  })()}
                  <p className="text-sm font-semibold text-hg-text truncate">{item.product_title}</p>
                  <p className="text-[10px] text-hg-text-secondary uppercase tracking-wider">
                    Qty {item.quantity}
                  </p>
                </div>
                <span className="font-bold text-sm text-hg-text">
                  {convertToLocale({ amount: item.subtotal ?? 0, currency_code: currencyCode })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-auto pt-6 border-t border-hg-border space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-hg-text-secondary">Subtotal</span>
          <span className="text-hg-text">{convertToLocale({ amount: subtotal, currency_code: currencyCode })}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-sm text-hg-gold">
            <span>Member Discount (VIP)</span>
            <span>-{convertToLocale({ amount: discount, currency_code: currencyCode })}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-hg-text-secondary">Shipping</span>
          <span className="text-hg-text">
            {shippingRow.text}
          </span>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-hg-border">
          <span className="text-sm font-bold text-hg-text uppercase tracking-wide">Total</span>
          <span className="text-xl font-bold text-hg-gold">
            {convertToLocale({ amount: total, currency_code: currencyCode })}
          </span>
        </div>

      </div>
    </div>
  )
}

export default CheckoutSummary
