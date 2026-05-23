import type { Meta, StoryObj } from "@storybook/react"
import Checkbox from "./index"

const meta = {
  title: "Components/Checkbox",
  component: Checkbox,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    onChange: { action: "changed" },
  },
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { label: "Subscribe to newsletter" },
}

export const Checked: Story = {
  args: { label: "Accept terms", checked: true },
}

export const Indeterminate: Story = {
  args: { label: "Select all", indeterminate: true, checked: true },
}

export const Disabled: Story = {
  args: { label: "Disabled option", disabled: true },
}

export const NoLabel: Story = {
  args: { checked: true },
}
