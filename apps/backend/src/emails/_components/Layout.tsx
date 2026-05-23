import * as React from "react"
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"

export type LayoutProps = {
  preview: string
  storeUrl: string
  /**
   * When true, the footer renders an "Update email preferences" link.
   * Transactional emails (orders, applications) MUST pass false.
   */
  isMarketing?: boolean
  children: React.ReactNode
}

const main = {
  backgroundColor: "#f6f6f6",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
}

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  maxWidth: "560px",
  padding: "40px 24px",
}

const footer = {
  color: "#666666",
  fontSize: "12px",
  lineHeight: "20px",
  marginTop: "32px",
  textAlign: "center" as const,
}

const footerLink = {
  color: "#666666",
  textDecoration: "underline",
}

export function Layout({
  preview,
  storeUrl,
  isMarketing = false,
  children,
}: LayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section>{children}</Section>
          <Hr style={{ borderColor: "#eeeeee", margin: "32px 0 16px" }} />
          <Text style={footer}>
            — The {process.env.BRAND_NAME || "Example Store"} Team
            <br />
            <Link href={storeUrl} style={footerLink}>
              {(storeUrl || "").replace(/^https?:\/\//, "")}
            </Link>
            {isMarketing ? (
              <>
                {" · "}
                <Link
                  href={`${storeUrl}/account/email-settings`}
                  style={footerLink}
                >
                  Update email preferences
                </Link>
              </>
            ) : null}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default Layout
