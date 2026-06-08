import * as React from "react"
import { Text } from "@react-email/components"
import Layout from "./_components/Layout"
import Heading from "./_components/Heading"

export type ApplicationRejectedProps = {
  name: string
  storeUrl: string
}

export const subject = (_p: ApplicationRejectedProps) => "Your Hops & Glory application"

export default function ApplicationRejectedEmail({
  name = "Alex",
  storeUrl = "https://hopsandglory.au",
}: ApplicationRejectedProps) {
  return (
    <Layout preview="An update on your membership application" storeUrl={storeUrl}>
      <Heading>Thank you for applying</Heading>
      <Text style={body}>Hi {name},</Text>
      <Text style={body}>
        After careful consideration, we&apos;re unable to offer membership at this time. We keep our
        community intentionally small to preserve the experience for existing collectors.
      </Text>
      <Text style={body}>
        We do revisit applications periodically — you&apos;re welcome to apply again in the future.
      </Text>
    </Layout>
  )
}

const body = {
  color: "#1E2421",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 16px",
}
