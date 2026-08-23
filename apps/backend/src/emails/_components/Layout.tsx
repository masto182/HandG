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

/**
 * Mobile collapse rule for the new-drop-digest 2-column beer grid
 * (`.hg-drop-col` cells in NewDropProductGrid) - Outlook/webmail can't do
 * CSS Grid/Flexbox, so multi-column email layouts use plain tables that
 * need an explicit media query to stack on small screens. Scoped to this
 * one class so other templates sharing this Layout are unaffected.
 */
const dropGridMobileStyle = `
  @media only screen and (max-width: 600px) {
    .hg-drop-col {
      display: block !important;
      width: 100% !important;
      padding-left: 0 !important;
      padding-right: 0 !important;
    }
  }
`

export type LayoutProps = {
  preview: string
  storeUrl: string
  isMarketing?: boolean
  children: React.ReactNode
}

const main = {
  backgroundColor: "#F5F7F4",
  fontFamily:
    "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
}

const container = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #D9E0DA",
  borderRadius: "8px",
  margin: "32px auto",
  maxWidth: "600px",
  padding: "0",
}

const topBar = {
  backgroundColor: "#3F7C62",
  borderRadius: "8px 8px 0 0",
  height: "4px",
  width: "100%",
  display: "block",
}

const header = {
  padding: "24px 32px 20px",
  borderBottom: "1px solid #D9E0DA",
}

const wordmark = {
  color: "#1E2421",
  fontSize: "13px",
  fontWeight: 700,
  letterSpacing: "0.12em",
  margin: 0,
  textTransform: "uppercase" as const,
}

const content = {
  padding: "32px 32px 24px",
}

const footer = {
  borderTop: "1px solid #D9E0DA",
  padding: "20px 32px 24px",
}

const footerText = {
  color: "#66706B",
  fontSize: "12px",
  lineHeight: "20px",
  margin: "0 0 4px",
}

const footerLink = {
  color: "#3F7C62",
  textDecoration: "none",
}

const footerAddress = {
  color: "#8A948E",
  fontSize: "11px",
  lineHeight: "18px",
  margin: "8px 0 0",
}

export function Layout({ preview, storeUrl, isMarketing = false, children }: LayoutProps) {
  return (
    <Html>
      <Head>
        <style>{dropGridMobileStyle}</style>
      </Head>
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={topBar} />
          <Section style={header}>
            <Text style={wordmark}>Hops &amp; Glory</Text>
          </Section>
          <Section style={content}>{children}</Section>
          <Section style={footer}>
            <Hr style={{ borderColor: "#D9E0DA", margin: "0 0 16px" }} />
            <Text style={footerText}>
              — The {process.env.BRAND_NAME || "Hops & Glory"} Team
              {" · "}
              <Link href={storeUrl} style={footerLink}>
                {(storeUrl || "hopsandglory.au").replace(/^https?:\/\//, "")}
              </Link>
              {isMarketing ? (
                <>
                  {" · "}
                  <Link href={`${storeUrl}/account/email-settings`} style={footerLink}>
                    Update email preferences
                  </Link>
                </>
              ) : null}
            </Text>
            <Text style={footerAddress}>
              {process.env.STORE_ADDRESS || "Hops & Glory · Melbourne VIC 3000, Australia"}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default Layout
