import * as React from "react"
import { Section, Text } from "@react-email/components"
import Layout from "./_components/Layout"
import Heading from "./_components/Heading"
import Button from "./_components/Button"

export type PasswordResetProps = {
  name: string
  resetUrl: string
  storeUrl: string
}

export const subject = (_p: PasswordResetProps) => "Reset your Hops & Glory password"

export default function PasswordResetEmail({
  name = "there",
  resetUrl = "https://hopsandglory.au/reset-password",
  storeUrl = "https://hopsandglory.au",
}: PasswordResetProps) {
  return (
    <Layout preview="Reset your password — link expires in 1 hour" storeUrl={storeUrl}>
      <Heading>Password reset</Heading>
      <Text style={body}>
        Hi {name}, we received a request to reset the password for your Hops &amp; Glory account.
        Click the button below to choose a new password.
      </Text>
      <Button href={resetUrl}>Reset password</Button>
      <Section style={noteBox}>
        <Text style={noteText}>
          This link expires in <strong>1 hour</strong>. If you didn&apos;t request a password reset,
          you can safely ignore this email — your account has not been changed.
        </Text>
      </Section>
    </Layout>
  )
}

const body = {
  color: "#1E2421",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 24px",
}

const noteBox = {
  backgroundColor: "#F5F5F0",
  border: "1px solid #DDDDD8",
  borderRadius: "8px",
  padding: "16px 20px",
  margin: "24px 0 0",
}

const noteText = {
  color: "#66706B",
  fontSize: "13px",
  lineHeight: "1.5",
  margin: 0,
}
