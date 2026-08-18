import type { EmailTemplateModule } from "./render-email"
import * as ApplicationReceivedTpl from "../emails/application-received"
import * as ApplicationApprovedTpl from "../emails/application-approved"
import * as ApplicationRejectedTpl from "../emails/application-rejected"
import * as OrderPlacedTpl from "../emails/order-placed"
import * as OrderPaymentCapturedTpl from "../emails/order-payment-captured"
import * as OrderShippedTpl from "../emails/order-shipped"
import * as OrderReadyForPickupTpl from "../emails/order-ready-for-pickup"
import * as VipTierUpTpl from "../emails/vip-tier-up"
import * as VipDemotionWarningTpl from "../emails/vip-demotion-warning"
import * as RestockAvailableTpl from "../emails/restock-available"
import * as WishlistLowStockTpl from "../emails/wishlist-low-stock"
import * as WishlistPriceAlertTpl from "../emails/wishlist-price-alert"
import * as WishlistOfferApprovedTpl from "../emails/wishlist-offer-approved"
import * as NewDropTpl from "../emails/new-drop"
import * as ReferralRewardedTpl from "../emails/referral-rewarded"
import * as CustomerEmailChangeTpl from "../emails/customer-email-change"
import * as PasswordResetTpl from "../emails/password-reset"

import {
  getApplicationReceivedSample,
  getApplicationApprovedSample,
  getApplicationRejectedSample,
  getOrderPlacedSample,
  getOrderPaymentCapturedSample,
  getOrderShippedSample,
  getOrderReadyForPickupSample,
  getVipTierUpSample,
  getVipDemotionWarningSample,
  getRestockAvailableSample,
  getWishlistLowStockSample,
  getWishlistPriceAlertSample,
  getWishlistOfferApprovedSample,
  getNewDropSample,
  getReferralRewardedSample,
  getCustomerEmailChangeSample,
  getPasswordResetSample,
  refreshEmailPreviewConfig,
  type PreviewResult,
} from "./email-preview-data"

export type EmailPreviewEntry = {
  label: string
  module: EmailTemplateModule<any>
  getSampleProps: (container: any) => Promise<PreviewResult<any>>
}

export const EMAIL_PREVIEW_REGISTRY: Record<string, EmailPreviewEntry> = {
  "application-received": {
    label: "Application received",
    module: ApplicationReceivedTpl,
    getSampleProps: getApplicationReceivedSample,
  },
  "application-approved": {
    label: "Application approved",
    module: ApplicationApprovedTpl,
    getSampleProps: getApplicationApprovedSample,
  },
  "application-rejected": {
    label: "Application rejected",
    module: ApplicationRejectedTpl,
    getSampleProps: getApplicationRejectedSample,
  },
  "order-placed": {
    label: "Order placed",
    module: OrderPlacedTpl,
    getSampleProps: getOrderPlacedSample,
  },
  "order-payment-captured": {
    label: "Order payment captured",
    module: OrderPaymentCapturedTpl,
    getSampleProps: getOrderPaymentCapturedSample,
  },
  "order-shipped": {
    label: "Order shipped",
    module: OrderShippedTpl,
    getSampleProps: getOrderShippedSample,
  },
  "order-ready-for-pickup": {
    label: "Order ready for pickup",
    module: OrderReadyForPickupTpl,
    getSampleProps: getOrderReadyForPickupSample,
  },
  "restock-available": {
    label: "Restock available",
    module: RestockAvailableTpl,
    getSampleProps: getRestockAvailableSample,
  },
  "new-drop": {
    label: "New drop",
    module: NewDropTpl,
    getSampleProps: getNewDropSample,
  },
  "wishlist-low-stock": {
    label: "Wishlist low stock",
    module: WishlistLowStockTpl,
    getSampleProps: getWishlistLowStockSample,
  },
  "wishlist-price-alert": {
    label: "Wishlist price alert",
    module: WishlistPriceAlertTpl,
    getSampleProps: getWishlistPriceAlertSample,
  },
  "wishlist-offer-approved": {
    label: "Wishlist offer approved",
    module: WishlistOfferApprovedTpl,
    getSampleProps: getWishlistOfferApprovedSample,
  },
  "vip-tier-up": {
    label: "VIP tier up",
    module: VipTierUpTpl,
    getSampleProps: getVipTierUpSample,
  },
  "vip-demotion-warning": {
    label: "VIP demotion warning",
    module: VipDemotionWarningTpl,
    getSampleProps: getVipDemotionWarningSample,
  },
  "referral-rewarded": {
    label: "Referral rewarded",
    module: ReferralRewardedTpl,
    getSampleProps: getReferralRewardedSample,
  },
  "password-reset": {
    label: "Password reset",
    module: PasswordResetTpl,
    getSampleProps: getPasswordResetSample,
  },
  "customer-email-change": {
    label: "Customer email change",
    module: CustomerEmailChangeTpl,
    getSampleProps: getCustomerEmailChangeSample,
  },
}

export { refreshEmailPreviewConfig }
