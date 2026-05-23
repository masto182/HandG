import type { Meta, StoryObj } from "@storybook/react"
import CartTotals from "./index"

const meta = {
  title: "Modules/Cart/CartTotals",
  component: CartTotals,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof CartTotals>

export default meta
type Story = StoryObj<typeof meta>

const wrap = (Story: any) => (
  <div className="w-[400px]">
    <Story />
  </div>
)

export const FullBreakdown: Story = {
  args: {
    totals: {
      subtotal: 12000,
      item_subtotal: 12000,
      shipping_total: 1500,
      tax_total: 1200,
      discount_total: 1000,
      total: 13700,
      currency_code: "usd",
    },
  },
  decorators: [wrap],
}

export const FreeShipping: Story = {
  args: {
    totals: {
      subtotal: 9999,
      shipping_total: 0,
      tax_total: 999,
      total: 10998,
      currency_code: "usd",
    },
  },
  decorators: [wrap],
}

export const Empty: Story = {
  args: {
    totals: {
      subtotal: 0,
      shipping_total: 0,
      tax_total: 0,
      total: 0,
      currency_code: "usd",
    },
  },
  decorators: [wrap],
}
