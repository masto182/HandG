export const NOTIFICATION_TEMPLATES = {
  APPLICATION_RECEIVED: {
    id: "application-received",
    subject: "Application Received — Hops & Glory",
    description: "Sent when a new member registers",
  },
  MEMBERSHIP_APPROVED: {
    id: "membership-approved",
    subject: "Welcome to Hops & Glory!",
    description: "Sent when admin approves a member (includes referral code)",
  },
  MEMBERSHIP_REJECTED: {
    id: "membership-rejected",
    subject: "Membership Update — Hops & Glory",
    description: "Sent when admin rejects an application",
  },
  ORDER_PLACED: {
    id: "order-placed",
    subject: "Order Confirmed — PayID Instructions",
    description: "Sent when order is placed (includes PayID alias + reference)",
  },
  PAYMENT_CONFIRMED: {
    id: "payment-confirmed",
    subject: "Payment Received — Hops & Glory",
    description: "Sent when admin captures payment",
  },
  ORDER_SHIPPED: {
    id: "order-shipped",
    subject: "Your Order Has Shipped!",
    description: "Sent when order is fulfilled (includes tracking)",
  },
  VIP_PROMOTION: {
    id: "vip-promotion",
    subject: "Congratulations! You've been promoted!",
    description: "Sent on VIP tier upgrade",
  },
  VIP_DEMOTION_WARNING: {
    id: "vip-demotion-warning",
    subject: "Your VIP Status May Change",
    description: "Sent 30 days before potential demotion",
  },
  VIP_DEMOTION_EXECUTED: {
    id: "vip-demotion-executed",
    subject: "VIP Status Update",
    description: "Sent when demotion is executed",
  },
  RESTOCK_ALERT: {
    id: "restock-alert",
    subject: "Back in Stock!",
    description: "Sent when a beer the customer was watching is restocked",
  },
} as const

export type NotificationType = keyof typeof NOTIFICATION_TEMPLATES
