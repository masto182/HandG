import * as React from "react"
import { Text } from "@react-email/components"
import Layout from "./_components/Layout"
import Heading from "./_components/Heading"
import Button from "./_components/Button"

export type BroadcastAnnouncementProps = {
  name: string
  title: string
  body: string
  linkText?: string | null
  linkUrl?: string | null
  storeUrl: string
}

export const subject = (p: BroadcastAnnouncementProps) => p.title

export default function BroadcastAnnouncementEmail({
  name = "Alex",
  title = "New at Hops & Glory",
  body = "We've added some new features you'll want to know about.",
  linkText,
  linkUrl,
  storeUrl = "https://hopsandglory.au",
}: BroadcastAnnouncementProps) {
  return (
    <Layout preview={title} storeUrl={storeUrl} isMarketing>
      <Heading>{title}</Heading>
      <Text style={greeting}>Hi {name},</Text>
      <Text style={bodyStyle}>{body}</Text>
      {linkUrl ? <Button href={linkUrl}>{linkText || "Learn More"}</Button> : null}
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
  whiteSpace: "pre-wrap" as const,
}
