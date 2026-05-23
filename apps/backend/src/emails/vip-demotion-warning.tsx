import * as React from "react"
import { Text } from "@react-email/components"
import Layout from "./_components/Layout"
import Heading from "./_components/Heading"
import Button from "./_components/Button"

export type VipDemotionWarningProps = {
  name: string
  currentTier: string
  daysRemaining: number
  storeUrl: string
}

const tierLevel = (tier: string) => tier.replace(/^vip/i, "")

export const subject = (p: VipDemotionWarningProps) =>
  `Your VIP ${tierLevel(p.currentTier)} status is at risk`

export default function VipDemotionWarningEmail({
  name,
  currentTier,
  daysRemaining,
  storeUrl,
}: VipDemotionWarningProps) {
  const level = tierLevel(currentTier)
  return (
    <Layout
      preview={`VIP ${level} status: ${daysRemaining} days to retain`}
      storeUrl={storeUrl}
      isMarketing
    >
      <Heading>Status Review</Heading>
      <Text>Hi {name},</Text>
      <Text>
        Your <strong>VIP {level}</strong> status is up for review. Based on
        the last 12 months of activity, you&apos;re currently below the
        threshold for VIP {level}.
      </Text>
      <Text>
        You have <strong>{daysRemaining} days</strong> to make a qualifying
        purchase or referral to retain your tier.
      </Text>
      <Button href={`${storeUrl}/store`}>Browse Collection</Button>
    </Layout>
  )
}
