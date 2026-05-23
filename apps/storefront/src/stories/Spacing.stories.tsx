import type { Meta, StoryObj } from "@storybook/react"

const STEPS = [
  { name: "1", px: 4 },
  { name: "2", px: 8 },
  { name: "3", px: 12 },
  { name: "4", px: 16 },
  { name: "6", px: 24 },
  { name: "8", px: 32 },
  { name: "12", px: 48 },
  { name: "16", px: 64 },
]

const meta: Meta = {
  title: "Foundations/Spacing",
  parameters: { layout: "padded" },
}

export default meta
type Story = StoryObj

export const Scale: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {STEPS.map((s) => (
        <div key={s.name} className="flex items-center gap-4 font-mono text-sm">
          <span className="w-12 text-on-surface-variant">{s.name}</span>
          <div className="bg-primary" style={{ width: s.px, height: 12 }} />
          <span className="text-on-surface-variant">{s.px}px</span>
        </div>
      ))}
    </div>
  ),
}
