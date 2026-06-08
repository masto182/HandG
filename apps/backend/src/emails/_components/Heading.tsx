import * as React from "react"
import { Heading as REHeading } from "@react-email/components"

export type HeadingProps = {
  level?: 1 | 2
  children: React.ReactNode
}

const h1 = {
  color: "#1E2421",
  fontSize: "22px",
  fontWeight: 700,
  lineHeight: "30px",
  margin: "0 0 16px",
  letterSpacing: "-0.3px",
}

const h2 = {
  color: "#3F7C62",
  fontSize: "13px",
  fontWeight: 600,
  lineHeight: "20px",
  margin: "24px 0 8px",
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
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
