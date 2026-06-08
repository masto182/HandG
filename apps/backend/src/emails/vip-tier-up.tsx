import * as React from "react"
import { Section, Text } from "@react-email/components"
import Layout from "./_components/Layout"
import Heading from "./_components/Heading"
import Button from "./_components/Button"

export type VipTierUpProps = {
  name: string
  newTier: string
  storeUrl: string
}

const tierLevel = (tier: string) => tier.replace(/^vip/i, "")

export const subject = (p: VipTierUpProps) => `You've reached VIP ${tierLevel(p.newTier)}`

export default function VipTierUpEmail({
  name = "Alex",
  newTier = "vip2",
  storeUrl = "https://hopsandglory.au",
}: VipTierUpProps) {
  const level = tierLevel(newTier)
  return (
    <Layout
      preview={`Promoted to VIP ${level} — your access has been upgraded`}
      storeUrl={storeUrl}
      isMarketing
    >
      <Section style={{ textAlign: "center", margin: "0 0 24px" }}>
        <Text style={badge}>VIP {level}</Text>
      </Section>
      <Heading>
        Welcome to VIP {level}, {name}
      </Heading>
      <Text style={body}>
        Your commitment to the collection has earned you VIP {level} status. You now have access to
        exclusive early-release drops, priority queue on limited bottles, and members-only
        allocations.
      </Text>
      <Heading level={2}>What this means for you</Heading>
      <Text style={bulletItem}>→ Priority access to limited releases</Text>
      <Text style={bulletItem}>→ Exclusive VIP-only drops</Text>
      <Text style={bulletItem}>→ First notification on new arrivals</Text>
      <Button href={`${storeUrl}/account/vip`}>View Your VIP Status</Button>
    </Layout>
  )
}

const badge = {
  backgroundColor: "#3F7C62",
  borderRadius: "999px",
  color: "#FFFFFF",
  display: "inline-block" as const,
  fontSize: "13px",
  fontWeight: 700,
  letterSpacing: "0.1em",
  margin: 0,
  padding: "6px 20px",
  textTransform: "uppercase" as const,
}

const body = {
  color: "#1E2421",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 24px",
}

const bulletItem = {
  color: "#1E2421",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0 0 8px",
  paddingLeft: "4px",
}
