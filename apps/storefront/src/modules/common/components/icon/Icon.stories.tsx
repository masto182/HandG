import type { Meta, StoryObj } from "@storybook/react"
import Icon from "./index"

const meta = {
  title: "Components/Icon",
  component: Icon,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    size: { control: { type: "range", min: 12, max: 96, step: 4 } },
    filled: { control: "boolean" },
  },
} satisfies Meta<typeof Icon>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { args: { name: "shopping_cart", size: 32 } }
export const Filled: Story = { args: { name: "favorite", size: 32, filled: true } }
export const Large: Story = { args: { name: "storefront", size: 64 } }
export const Common: Story = {
  render: () => (
    <div className="grid grid-cols-6 gap-6 text-center">
      {[
        "shopping_cart",
        "favorite",
        "search",
        "person",
        "menu",
        "close",
        "check_circle",
        "warning",
        "error",
        "info",
        "chevron_right",
        "arrow_forward",
      ].map((name) => (
        <div key={name} className="flex flex-col items-center gap-1">
          <Icon name={name} size={32} />
          <span className="font-mono text-xs text-on-surface-variant">{name}</span>
        </div>
      ))}
    </div>
  ),
}
