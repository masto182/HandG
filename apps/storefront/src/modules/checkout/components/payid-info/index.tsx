import { PAYID_ALIAS } from "@lib/constants/payment"

const PayIdInfo = ({ orderId, payidAlias }: { orderId?: string; payidAlias?: string }) => {
  const reference = orderId || `HG-${Date.now().toString(36).toUpperCase()}`
  const alias = payidAlias || PAYID_ALIAS

  return (
    <div className="bg-hg-surface border border-hg-border rounded-lg p-4 mt-2">
      <p className="text-sm font-semibold text-hg-text mb-2">
        Pay via PayID
      </p>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-hg-text-secondary">PayID:</span>
          <span className="text-sm font-mono text-hg-gold">
            {alias}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-hg-text-secondary">Reference:</span>
          <span className="text-sm font-mono text-hg-text">
            {reference}
          </span>
        </div>
      </div>
      <p className="text-xs text-hg-text-muted mt-3">
        Transfer the order total to the PayID above with the reference shown.
        Your order will be confirmed once payment is verified by our team.
      </p>
    </div>
  )
}

export default PayIdInfo
