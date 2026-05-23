import type { Meta, StoryObj } from "@storybook/react"

/**
 * # Retail Example — Storybook
 *
 * This Storybook hosts the storefront's design system and component
 * library. Stories are co-located next to components as
 * `*.stories.tsx`.
 *
 * ## Conventions
 *
 * - **Foundations** — colour, typography, spacing, icons.
 * - **Components** — primitives (Button, Input, Card, …).
 * - **Modules** — composed surfaces (ProductCard, CartLine, Footer, …).
 *
 * ## Tooling
 *
 * - `@storybook/addon-essentials` — controls, actions, viewport, …
 * - `@storybook/addon-a11y`       — axe-core checks per story
 * - `@storybook/addon-themes`     — light/dark toggle
 * - `@storybook/addon-interactions` — replay user flows in stories
 *
 * ## Running
 *
 * ```bash
 * pnpm --filter ./apps/storefront storybook       # dev
 * pnpm --filter ./apps/storefront build-storybook # static export
 * pnpm --filter ./apps/storefront test:storybook  # interaction + a11y test runner
 * ```
 */
const meta: Meta = {
  title: "Introduction",
}

export default meta
type Story = StoryObj

export const Welcome: Story = {
  render: () => (
    <div style={{ maxWidth: 640, padding: 32, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Retail Example</h1>
      <p style={{ color: "#666" }}>
        Browse Foundations / Components / Modules from the sidebar to see the
        design system in action.
      </p>
    </div>
  ),
}
