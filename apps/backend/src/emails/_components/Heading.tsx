import * as React from "react"
import { Heading as REHeading } from "@react-email/components"

export type HeadingProps = {
  level?: 1 | 2
  children: React.ReactNode
}

const h1 = {
  color: "#D4A843",
  fontSize: "26px",
  fontWeight: 700,
  lineHeight: "32px",
  margin: "0 0 16px",
  letterSpacing: "-0.5px",
}

const h2 = {
  color: "#1a1a1a",
  fontSize: "18px",
  fontWeight: 600,
  lineHeight: "24px",
  margin: "24px 0 8px",
}

export function Heading({ level = 1, children }: HeadingProps) {
  const style = level === 1 ? h1 : h2
  const as = level === 1 ? "h1" : "h2"
  return (
    <REHeading as={as} style={style}>
      {children}
    </REHeading>
  )
}

export default Heading
