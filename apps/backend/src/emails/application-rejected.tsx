import * as React from "react"
import { Text } from "@react-email/components"
import Layout from "./_components/Layout"
import Heading from "./_components/Heading"

export type ApplicationRejectedProps = {
  name: string
  storeUrl: string
}

export const subject = (_p: ApplicationRejectedProps) =>
  "Regarding your application"

export default function ApplicationRejectedEmail({
  name,
  storeUrl,
}: ApplicationRejectedProps) {
  return (
    <Layout
      preview="An update on your Hops & Glory application"
      storeUrl={storeUrl}
    >
      <Heading>Hops &amp; Glory</Heading>
      <Text>Hi {name},</Text>
      <Text>
        Unfortunately, we&apos;re unable to approve your application at this
        time. We maintain a very selective membership to preserve the
        experience for our collectors.
      </Text>
      <Text>You&apos;re welcome to reapply in the future.</Text>
    </Layout>
  )
}
