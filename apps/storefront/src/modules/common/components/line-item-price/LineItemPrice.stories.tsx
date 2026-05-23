import type { Meta, StoryObj } from "@storybook/react"
import LineItemPrice from "./index"

const meta = {
  title: "Modules/Cart/LineItemPrice",
  component: LineItemPrice,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof LineItemPrice>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { currencyCode: "usd", originalPrice: 4500, adjustedPrice: 4500 },
}

export const Discounted: Story = {
  args: { currencyCode: "usd", originalPrice: 6000, adjustedPrice: 4200 },
}

export const Tight: Story = {
  args: { currencyCode: "usd", originalPrice: 6000, adjustedPrice: 4200, style: "tight" },
}

export const HighValue: Story = {
  args: { currencyCode: "usd", originalPrice: 250000, adjustedPrice: 199900 },
}
