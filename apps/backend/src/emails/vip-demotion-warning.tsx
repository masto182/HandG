import * as React from "react"
import { Section, Text } from "@react-email/components"
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
  `Your VIP ${tierLevel(p.currentTier)} status is up for review`

export default function VipDemotionWarningEmail({
  name = "Alex",
  currentTier = "vip2",
  daysRemaining = 14,
  storeUrl = "https://hopsandglory.au",
}: VipDemotionWarningProps) {
  const level = tierLevel(currentTier)
  return (
    <Layout
      preview={`VIP ${level} review: ${daysRemaining} days to retain your status`}
      storeUrl={storeUrl}
      isMarketing
    >
      <Heading>Your VIP {level} status is up for review</Heading>
      <Text style={body}>Hi {name},</Text>
      <Text style={body}>
        Based on activity over the past 12 months, your VIP {level} status is due for its annual
        review. You&apos;re currently below the threshold to retain it.
      </Text>

      <Section style={urgencyBox}>
        <Text style={urgencyLabel}>Time remaining</Text>
        <Text style={urgencyDays}>{daysRemaining} days</Text>
      </Section>

      <Heading level={2}>How to retain your status</Heading>
      <Text style={retainItem}>→ Place a qualifying order</Text>
      <Text style={retainItem}>→ Refer a new member who completes their first purchase</Text>

      <Button href={`${storeUrl}/store`}>Browse Collection</Button>
    </Layout>
  )
}

const body = {
  color: "#1E2421",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 16px",
}

const urgencyBox = {
  backgroundColor: "#FFFBF0",
  border: "1px solid #D69A4F",
  borderRadius: "6px",
  margin: "0 0 24px",
  padding: "16px 20px",
  textAlign: "center" as const,
}

const urgencyLabel = {
  color: "#A06A2C",
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.08em",
  margin: "0 0 4px",
  textTransform: "uppercase" as const,
}

const urgencyDays = {
  color: "#1E2421",
  fontSize: "28px",
  fontWeight: 700,
  margin: 0,
}

const retainItem = {
  color: "#1E2421",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0 0 10px",
}
