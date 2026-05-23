import * as React from "react"
import { Text } from "@react-email/components"
import Layout from "./_components/Layout"
import Heading from "./_components/Heading"
import Button from "./_components/Button"

export type VipTierUpProps = {
  name: string
  newTier: string
  storeUrl: string
}

const tierLevel = (tier: string) => tier.replace(/^vip/i, "")

export const subject = (p: VipTierUpProps) =>
  `You've reached VIP ${tierLevel(p.newTier)}`

export default function VipTierUpEmail({
  name,
  newTier,
  storeUrl,
}: VipTierUpProps) {
  const level = tierLevel(newTier)
  return (
    <Layout
      preview={`Promoted to VIP ${level}`}
      storeUrl={storeUrl}
      isMarketing
    >
      <Heading>★ VIP {level}</Heading>
      <Text>Congratulations {name},</Text>
      <Text>
        You&apos;ve been promoted to <strong>VIP {level}</strong>. You now
        have access to exclusive releases and priority drops reserved for our
        most valued collectors.
      </Text>
      <Button href={`${storeUrl}/account/vip`}>View VIP Status</Button>
    </Layout>
  )
}
