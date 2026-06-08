import * as React from "react"
import { Section, Text } from "@react-email/components"
import Layout from "./_components/Layout"
import Heading from "./_components/Heading"
import Button from "./_components/Button"

export type CustomerEmailChangeProps = {
  name: string
  newEmail: string
  verifyUrl: string
  storeUrl: string
  expiresInHours: number
}

export const subject = (_p: CustomerEmailChangeProps) => "Confirm your new email address"

export default function CustomerEmailChangeEmail({
  name = "Alex",
  newEmail = "alex.new@example.com",
  verifyUrl = "https://hopsandglory.au/verify",
  storeUrl = "https://hopsandglory.au",
  expiresInHours = 24,
}: CustomerEmailChangeProps) {
  return (
    <Layout preview="Action required: confirm the email change on your account" storeUrl={storeUrl}>
      <Heading>Confirm your new email</Heading>
      <Text style={body}>Hi {name},</Text>
      <Text style={body}>
        We received a request to change the email address on your Hops &amp; Glory account to:
      </Text>
      <Section style={emailBlock}>
        <Text style={emailValue}>{newEmail}</Text>
      </Section>
      <Button href={verifyUrl}>Confirm Email Change</Button>
      <Text style={expiry}>
        This link expires in {expiresInHours} hour
        {expiresInHours === 1 ? "" : "s"}.
      </Text>
      <Section style={securityBox}>
        <Text style={securityLabel}>Not you?</Text>
        <Text style={securityText}>
          If you didn&apos;t request this change, you can safely ignore this email — your current
          address remains active. If you believe someone else has accessed your account, please
          contact us at <span style={supportEmail}>support@hopsandglory.au</span>.
        </Text>
      </Section>
    </Layout>
  )
}

const body = {
  color: "#1E2421",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 16px",
}

const emailBlock = {
  backgroundColor: "#F0F6F3",
  border: "1px solid #D9E0DA",
  borderRadius: "6px",
  margin: "0 0 8px",
  padding: "12px 20px",
}

const emailValue = {
  color: "#1E2421",
  fontFamily: "monospace",
  fontSize: "16px",
  fontWeight: 700,
  margin: 0,
}

const expiry = {
  color: "#66706B",
  fontSize: "13px",
  margin: "0 0 24px",
  textAlign: "center" as const,
}

const securityBox = {
  backgroundColor: "#F5F7F4",
  border: "1px solid #D9E0DA",
  borderRadius: "6px",
  padding: "16px 20px",
}

const securityLabel = {
  color: "#1E2421",
  fontSize: "13px",
  fontWeight: 600,
  margin: "0 0 6px",
}

const securityText = {
  color: "#66706B",
  fontSize: "13px",
  lineHeight: "1.6",
  margin: 0,
}

const supportEmail = {
  color: "#3F7C62",
}
