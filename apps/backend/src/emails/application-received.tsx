import * as React from "react"
import { Text } from "@react-email/components"
import Layout from "./_components/Layout"
import Heading from "./_components/Heading"
import Button from "./_components/Button"

export type ApplicationReceivedProps = {
  name: string
  storeUrl: string
}

export const subject = (_p: ApplicationReceivedProps) => "We've received your application"

export default function ApplicationReceivedEmail({
  name = "Alex",
  storeUrl = "https://hopsandglory.au",
}: ApplicationReceivedProps) {
  return (
    <Layout
      preview="Your application is under review — we'll be in touch within 3–5 business days"
      storeUrl={storeUrl}
    >
      <Heading>Application received</Heading>
      <Text style={body}>Hi {name},</Text>
      <Text style={body}>
        Thank you for applying to join Hops &amp; Glory. Your application is now under review and
        you&apos;ll hear from us within 3–5 business days.
      </Text>
      <Text style={body}>
        In the meantime, take a look at our collection to see what awaits members.
      </Text>
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
