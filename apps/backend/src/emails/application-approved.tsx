import * as React from "react"
import { Text } from "@react-email/components"
import Layout from "./_components/Layout"
import Heading from "./_components/Heading"
import Button from "./_components/Button"

export type ApplicationApprovedProps = {
  name: string
  referralCode: string
  storeUrl: string
}

export const subject = (_p: ApplicationApprovedProps) =>
  "Welcome to Hops & Glory"

export default function ApplicationApprovedEmail({
  name,
  referralCode,
  storeUrl,
}: ApplicationApprovedProps) {
  return (
    <Layout
      preview="Your Hops & Glory membership is active"
      storeUrl={storeUrl}
    >
      <Heading>Welcome, {name}</Heading>
      <Text>
        Your application has been approved. You now have full access to the
        Hops &amp; Glory private collection.
      </Text>
      <Text>
        Your personal referral code:{" "}
        <strong style={{ color: "#D4A843", fontSize: "18px" }}>
          {referralCode}
        </strong>
      </Text>
      <Text>
        Share it with fellow collectors — every rewarded referral brings you
        closer to VIP status.
      </Text>
      <Button href={`${storeUrl}/store`}>Start Shopping</Button>
    </Layout>
  )
}
