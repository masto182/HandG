import type { Meta, StoryObj } from "@storybook/react"
import InteractiveLink from "./index"

const meta = {
  title: "Components/InteractiveLink",
  component: InteractiveLink,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    onClick: { action: "clicked" },
  },
} satisfies Meta<typeof InteractiveLink>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { href: "/store", children: "Shop the collection" },
}

export const ShortLabel: Story = {
  args: { href: "/cart", children: "View cart" },
}

export const LongLabel: Story = {
  args: { href: "/account/orders", children: "Track every order from your account" },
}
