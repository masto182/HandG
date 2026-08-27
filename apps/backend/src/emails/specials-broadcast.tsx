import * as React from "react"
import { Text } from "@react-email/components"
import Layout from "./_components/Layout"
import Heading from "./_components/Heading"
import Button from "./_components/Button"
import { SpecialsProductList, type SpecialsBatchItem } from "./_components/SpecialsProductRow"

export type SpecialsBroadcastProps = {
  name: string
  campaignTitle: string
  campaignDescription: string | null
  endsAtLabel: string | null
  items: SpecialsBatchItem[]
  storeUrl: string
}

export const subject = (p: SpecialsBroadcastProps) => p.campaignTitle

export default function SpecialsBroadcastEmail({
  name = "Alex",
  campaignTitle = "Flash Sale",
  campaignDescription = null,
  endsAtLabel = null,
  items = [],
  storeUrl = "https://hopsandglory.au",
}: SpecialsBroadcastProps) {
  return (
    <Layout preview={campaignTitle} storeUrl={storeUrl} isMarketing>
      <Heading>{campaignTitle}</Heading>
      <Text style={greeting}>Hi {name},</Text>
      {campaignDescription ? <Text style={bodyStyle}>{campaignDescription}</Text> : null}
      {endsAtLabel ? <Text style={urgency}>Ends {endsAtLabel}</Text> : null}
      <SpecialsProductList items={items} storeUrl={storeUrl} />
      <Button href={`${storeUrl}/store`}>Shop the Sale</Button>
    </Layout>
  )
}

const greeting = {
  color: "#1E2421",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 16px",
}

const bodyStyle = {
  color: "#1E2421",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 16px",
}

const urgency = {
  color: "#B5511C",
  fontSize: "13px",
  fontWeight: 700,
  margin: "0 0 20px",
  textTransform: "uppercase" as const,
}
