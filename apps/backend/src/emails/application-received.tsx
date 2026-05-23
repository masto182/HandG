import * as React from "react"
import { Text } from "@react-email/components"
import Layout from "./_components/Layout"
import Heading from "./_components/Heading"
import Button from "./_components/Button"

export type ApplicationReceivedProps = {
  name: string
  storeUrl: string
}

export const subject = (_p: ApplicationReceivedProps) =>
  "We've received your application"

export default function ApplicationReceivedEmail({
  name,
  storeUrl,
}: ApplicationReceivedProps) {
  return (
    <Layout
      preview="Your Hops & Glory application is under review"
      storeUrl={storeUrl}
    >
      <Heading>Hops &amp; Glory</Heading>
      <Text>Hi {name},</Text>
      <Text>
        Thank you for applying to join Hops &amp; Glory. Our team is reviewing
        your application and you&apos;ll hear from us soon.
      </Text>
      <Text>
        In the meantime, you can browse our collection to see what awaits.
      </Text>
      <Button href={`${storeUrl}/store`}>Browse Collection</Button>
    </Layout>
  )
}
