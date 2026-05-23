import type { Meta, StoryObj } from "@storybook/react"

const SWATCHES = [
  { name: "primary", token: "bg-primary text-on-primary" },
  { name: "secondary", token: "bg-secondary text-on-secondary" },
  { name: "tertiary", token: "bg-tertiary text-on-tertiary" },
  { name: "error", token: "bg-error text-on-error" },
  { name: "surface", token: "bg-surface text-on-surface border border-outline-variant" },
  { name: "surface-variant", token: "bg-surface-variant text-on-surface-variant" },
  { name: "outline", token: "bg-outline" },
  { name: "outline-variant", token: "bg-outline-variant" },
]

const meta: Meta = {
  title: "Foundations/Colors",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Brand colour tokens. Each swatch shows the Tailwind utility class plus a high-contrast text colour.",
      },
    },
  },
}

export default meta
type Story = StoryObj

export const Palette: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {SWATCHES.map((s) => (
        <div
          key={s.name}
          className={`rounded-md p-6 text-sm font-medium ${s.token}`}
          style={{ minHeight: 96 }}
        >
          {s.name}
        </div>
      ))}
    </div>
  ),
}
