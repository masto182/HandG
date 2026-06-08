import * as React from "react"
import { Section, Text } from "@react-email/components"
import Layout from "./_components/Layout"
import Heading from "./_components/Heading"
import Button from "./_components/Button"

export type ApplicationApprovedProps = {
  name: string
  referralCode: string
  storeUrl: string
}

export const subject = (_p: ApplicationApprovedProps) => "Welcome to Hops & Glory"

export default function ApplicationApprovedEmail({
  name = "Alex",
  referralCode = "ALEX2024",
  storeUrl = "https://hopsandglory.au",
}: ApplicationApprovedProps) {
  return (
    <Layout
      preview="Your membership is active — full access to the private collection"
      storeUrl={storeUrl}
    >
      <Heading>Welcome, {name}</Heading>
      <Text style={body}>
        Your application has been approved. You now have full access to Hops &amp; Glory&apos;s
        private collection — rare releases, brewery exclusives, and members-only drops.
      </Text>
      <Section style={referralBox}>
        <Text style={referralLabel}>Your referral code</Text>
        <Text style={referralCode_}>{referralCode}</Text>
        <Text style={referralNote}>
          Share your code with fellow collectors. Every referral who places their first order counts
          toward your VIP progression.
        </Text>
      </Section>
      <Button href={`${storeUrl}/store`}>Start Shopping</Button>
    </Layout>
  )
}

const body = {
  color: "#1E2421",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 24px",
}

const referralBox = {
  backgroundColor: "#E8F2EC",
  border: "1px solid #3F7C62",
  borderRadius: "8px",
  padding: "20px 24px",
  margin: "0 0 8px",
}

const referralLabel = {
  color: "#3F7C62",
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.1em",
  margin: "0 0 8px",
  textTransform: "uppercase" as const,
}

const referralCode_ = {
  color: "#1E2421",
  fontFamily: "monospace",
  fontSize: "22px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  margin: "0 0 12px",
}

const referralNote = {
  color: "#66706B",
  fontSize: "13px",
  lineHeight: "1.5",
  margin: 0,
}
