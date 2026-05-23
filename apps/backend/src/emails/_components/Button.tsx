import * as React from "react"
import { Button as REButton, Section } from "@react-email/components"

export type ButtonProps = {
  href: string
  children: React.ReactNode
}

const buttonStyle = {
  backgroundColor: "#D4A843",
  color: "#1a1a1a",
  fontSize: "14px",
  fontWeight: 600,
  letterSpacing: "0.5px",
  padding: "12px 24px",
  borderRadius: "24px",
  textDecoration: "none",
  textTransform: "uppercase" as const,
  display: "inline-block",
}

export function Button({ href, children }: ButtonProps) {
  return (
    <Section style={{ textAlign: "center", margin: "24px 0" }}>
      <REButton href={href} style={buttonStyle}>
        {children}
      </REButton>
    </Section>
  )
}

export default Button
