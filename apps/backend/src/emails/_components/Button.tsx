import * as React from "react"
import { Button as REButton, Section } from "@react-email/components"

export type ButtonProps = {
  href: string
  children: React.ReactNode
}

const buttonStyle = {
  backgroundColor: "#3F7C62",
  color: "#FFFFFF",
  fontSize: "12px",
  fontWeight: 600,
  letterSpacing: "0.08em",
  padding: "14px 28px",
  borderRadius: "8px",
  textDecoration: "none",
  textTransform: "uppercase" as const,
  display: "inline-block",
}

export function Button({ href, children }: ButtonProps) {
  return (
    <Section style={{ textAlign: "center", margin: "28px 0 8px" }}>
      <REButton href={href} style={buttonStyle}>
        {children}
      </REButton>
    </Section>
  )
}

export default Button
