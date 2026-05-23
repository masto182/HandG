import type { Meta, StoryObj } from "@storybook/react"
import Radio from "./index"

const meta = {
  title: "Components/Radio",
  component: Radio,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof Radio>

export default meta
type Story = StoryObj<typeof meta>

export const Unchecked: Story = { args: { label: "Standard shipping" } }
export const Checked: Story = { args: { label: "Express shipping", checked: true } }
export const Disabled: Story = { args: { label: "Same-day (unavailable)", disabled: true } }
export const Group: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Radio label="Pickup — Downtown" checked />
      <Radio label="Pickup — Suburb" />
      <Radio label="Standard shipping" />
      <Radio label="Express shipping" />
    </div>
  ),
}
