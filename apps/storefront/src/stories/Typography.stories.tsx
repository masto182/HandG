import type { Meta, StoryObj } from "@storybook/react"

const SCALE = [
  { name: "display-lg", className: "text-5xl font-semibold" },
  { name: "display-md", className: "text-4xl font-semibold" },
  { name: "title-lg", className: "text-3xl font-medium" },
  { name: "title-md", className: "text-2xl font-medium" },
  { name: "title-sm", className: "text-xl font-medium" },
  { name: "body-lg", className: "text-lg" },
  { name: "body-md", className: "text-base" },
  { name: "body-sm", className: "text-sm" },
  { name: "label", className: "text-xs uppercase tracking-wider" },
]

const meta: Meta = {
  title: "Foundations/Typography",
  parameters: { layout: "padded" },
}

export default meta
type Story = StoryObj

export const Scale: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {SCALE.map((s) => (
        <div key={s.name} className="flex items-baseline gap-6">
          <span className="w-32 text-sm text-on-surface-variant font-mono">{s.name}</span>
          <span className={s.className}>The quick brown fox</span>
        </div>
      ))}
    </div>
  ),
}
