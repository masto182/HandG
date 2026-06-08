import * as React from "react"
import { Section, Text } from "@react-email/components"
import Layout from "./_components/Layout"
import Heading from "./_components/Heading"
import Button from "./_components/Button"

export type ReferralRewardedProps = {
  name: string
  referralName: string
  storeUrl: string
}

export const subject = (p: ReferralRewardedProps) => `${p.referralName} placed their first order`

export default function ReferralRewardedEmail({
  name = "Alex",
  referralName = "Jordan",
  storeUrl = "https://hopsandglory.au",
}: ReferralRewardedProps) {
  return (
    <Layout
      preview={`${referralName} completed their first order — your referral is confirmed`}
      storeUrl={storeUrl}
      isMarketing
    >
      <Heading>Referral confirmed</Heading>
      <Text style={body}>Hi {name},</Text>
      <Text style={body}>
        <strong>{referralName}</strong> just placed their first order through your referral. This
        counts toward your VIP progression.
      </Text>
      <Section style={progressBox}>
        <Text style={progressLabel}>Your referrals</Text>
        <Text style={progressNote}>Keep sharing your code to progress faster.</Text>
      </Section>
      <Button href={`${storeUrl}/account/referrals`}>View Your Referrals</Button>
    </Layout>
  )
}

const body = {
  color: "#1E2421",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 16px",
}

const progressBox = {
  backgroundColor: "#E8F2EC",
  border: "1px solid #3F7C62",
  borderRadius: "6px",
  margin: "0 0 8px",
  padding: "16px 20px",
}

const progressLabel = {
  color: "#3F7C62",
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.08em",
  margin: "0 0 4px",
  textTransform: "uppercase" as const,
}

const progressNote = {
  color: "#66706B",
  fontSize: "13px",
  lineHeight: "1.5",
  margin: 0,
}
