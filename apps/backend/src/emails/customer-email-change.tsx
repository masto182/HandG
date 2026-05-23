import * as React from "react"
import { Text } from "@react-email/components"
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

export const subject = (_p: CustomerEmailChangeProps) =>
  "Confirm your new email address"

export default function CustomerEmailChangeEmail({
  name,
  newEmail,
  verifyUrl,
  storeUrl,
  expiresInHours,
}: CustomerEmailChangeProps) {
  return (
    <Layout
      preview="Confirm the email change on your Hops & Glory account"
      storeUrl={storeUrl}
    >
      <Heading>Hops &amp; Glory</Heading>
      <Text>Hi {name},</Text>
      <Text>
        We received a request to change the email on your account to{" "}
        <strong>{newEmail}</strong>. Click below to confirm the change.
      </Text>
      <Button href={verifyUrl}>Confirm new email</Button>
      <Text>
        This link will expire in {expiresInHours} hour
        {expiresInHours === 1 ? "" : "s"}. If you did not make this request, you
        can safely ignore this email.
      </Text>
    </Layout>
  )
}
