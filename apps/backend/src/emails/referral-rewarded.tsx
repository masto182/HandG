import * as React from "react"
import { Text } from "@react-email/components"
import Layout from "./_components/Layout"
import Heading from "./_components/Heading"
import Button from "./_components/Button"

export type ReferralRewardedProps = {
  name: string
  referralName: string
  storeUrl: string
}

export const subject = (_p: ReferralRewardedProps) =>
  "Your referral placed their first order"

export default function ReferralRewardedEmail({
  name,
  referralName,
  storeUrl,
}: ReferralRewardedProps) {
  return (
    <Layout
      preview={`${referralName} placed their first order`}
      storeUrl={storeUrl}
      isMarketing
    >
      <Heading>Referral Rewarded</Heading>
      <Text>Hi {name},</Text>
      <Text>
        Great news — {referralName} just placed their first order. This
        counts toward your VIP progression.
      </Text>
      <Button href={`${storeUrl}/account/referrals`}>View Referrals</Button>
    </Layout>
  )
}
