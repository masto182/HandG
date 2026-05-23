import * as React from "react"
import { render } from "@react-email/render"

/**
 * A template module exports:
 *   - default: React component taking props
 *   - subject: (props) => string
 */
export type EmailTemplateModule<P> = {
  default: React.ComponentType<P>
  subject: (props: P) => string
}

export type RenderedEmail = {
  html: string
  text: string
  subject: string
}

/**
 * Render a React Email template module to {html, text, subject}.
 * Pass the WHOLE module (e.g. `import * as Tpl from "./emails/order-placed"`)
 * so we can read the static `subject` export alongside the default component.
 */
export async function renderEmail<P>(
  template: EmailTemplateModule<P>,
  props: P
): Promise<RenderedEmail> {
  const Component = template.default as React.ComponentType<any>
  const element = React.createElement(Component, props as any)
  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ])
  return {
    html,
    text,
    subject: template.subject(props),
  }
}
